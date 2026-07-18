import { LineChart, Pencil, Plus, Trash2, Weight } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import NumberInput from "../components/NumberInput";
import { neonClient } from "../lib/auth";
import { useMeals } from "../store/MealContext";

type MeasurementKey =
  | "waist_cm"
  | "hip_cm"
  | "abdomen_cm"
  | "arm_cm"
  | "thigh_cm"
  | "calf_cm";
type WeightEntry = {
  id: string;
  measured_on: string;
  weight_kg: number | string;
} & Partial<Record<MeasurementKey, number | string | null>>;
const measurements: Array<{ key: MeasurementKey; label: string }> = [
  { key: "waist_cm", label: "Cintura (cm)" },
  { key: "hip_cm", label: "Anca (cm)" },
  { key: "abdomen_cm", label: "Abdominal (cm)" },
  { key: "arm_cm", label: "Braço (cm)" },
  { key: "thigh_cm", label: "Coxa (cm)" },
  { key: "calf_cm", label: "Gémeo (cm)" },
];
const today = () => new Date().toISOString().slice(0, 10);

export default function ProgressPage() {
  const { profile, syncProgressWeight } = useMeals();
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState(profile.weightKg);
  const [bodyMeasurements, setBodyMeasurements] = useState<
    Record<MeasurementKey, string>
  >({
    waist_cm: "",
    hip_cm: "",
    abdomen_cm: "",
    arm_cm: "",
    thigh_cm: "",
    calf_cm: "",
  });
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!neonClient) return;
    const { data, error: loadError } = await neonClient
      .from("weight_entries")
      .select(
        "id, measured_on, weight_kg, waist_cm, hip_cm, abdomen_cm, arm_cm, thigh_cm, calf_cm",
      )
      .eq("user_id", profile.userId)
      .order("measured_on");
    if (loadError) setError(loadError.message);
    else setEntries(data ?? []);
  };
  useEffect(() => {
    if (!neonClient) return;
    let active = true;
    neonClient
      .from("weight_entries")
      .select(
        "id, measured_on, weight_kg, waist_cm, hip_cm, abdomen_cm, arm_cm, thigh_cm, calf_cm",
      )
      .eq("user_id", profile.userId)
      .order("measured_on")
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(loadError.message);
        else setEntries(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [profile.userId]);
  const values = useMemo(
    () =>
      entries.map((entry) => ({ ...entry, weight: Number(entry.weight_kg) })),
    [entries],
  );
  const change =
    values.length > 1 ? values[values.length - 1].weight - values[0].weight : 0;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!neonClient) return;
    if (date > today()) {
      setError(t("Não podes guardar registos em datas futuras."));
      return;
    }
    const optionalMeasurements = Object.fromEntries(
      measurements.map(({ key }) => [
        key,
        bodyMeasurements[key] === "" ? null : Number(bodyMeasurements[key]),
      ]),
    ) as Record<MeasurementKey, number | null>;
    const { error: saveError } = await neonClient
      .from("weight_entries")
      .upsert(
        {
          user_id: profile.userId,
          measured_on: date,
          weight_kg: weight,
          ...optionalMeasurements,
        },
        { onConflict: "user_id,measured_on" },
      );
    if (saveError) setError(saveError.message);
    else {
      try {
        if (editing && editing.measured_on !== date)
          await neonClient.from("weight_entries").delete().eq("id", editing.id);
        await syncProgressWeight(weight);
        setMessage(
          t(
            profile.goalMode === "calculated"
              ? "Peso guardado e objetivos recalculados."
              : "Peso guardado com sucesso.",
          ),
        );
        setEditing(null);
        await load();
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : t("Não foi possível atualizar os objetivos."),
        );
      }
    }
  };
  const remove = async (id: string) => {
    if (!neonClient) return;
    const { error: deleteError } = await neonClient
      .from("weight_entries")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    else setEntries((current) => current.filter((entry) => entry.id !== id));
  };
  const startEdit = (entry: WeightEntry) => {
    setEditing(entry);
    setDate(entry.measured_on);
    setWeight(Number(entry.weight_kg));
    setBodyMeasurements(
      Object.fromEntries(
        measurements.map(({ key }) => [
          key,
          entry[key] == null ? "" : String(entry[key]),
        ]),
      ) as Record<MeasurementKey, string>,
    );
    setError("");
    setMessage("");
  };
  const locale = i18n.language.startsWith("en") ? "en-GB" : "pt-PT";
  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <p className="font-semibold text-leaf-600">{t("Progresso")}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
          {t("Histórico de peso")}
        </h1>
        <p className="mt-2 text-stone-400">
          {t("Regista o teu peso e acompanha a evolução ao longo do tempo.")}
        </p>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf-600/15 text-leaf-700">
              <LineChart size={22} />
            </div>
            <div>
              <h2 className="font-bold">{t("Evolução")}</h2>
              <p className="text-sm text-stone-400">
                {values.length
                  ? `${values[values.length - 1].weight} kg`
                  : t("Sem registos ainda")}
              </p>
            </div>
          </div>
          <WeightChart values={values} locale={locale} />
          <MeasurementChanges values={values} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label={t("Registos")} value={String(values.length)} />
            <Stat
              label={t("Variação")}
              value={
                values.length > 1
                  ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`
                  : "—"
              }
            />
          </div>
        </section>
        <form onSubmit={submit} className="card h-fit p-6">
          <div className="flex items-center gap-2">
            <Weight className="text-leaf-700" size={20} />
            <h2 className="font-bold">
              {t(editing ? "Editar registo de progresso" : "Adicionar registo")}
            </h2>
          </div>
          <label className="mt-5 block text-sm font-semibold">
            {t("Data")}
            <input
              className="input mt-2 !w-44 !min-w-0"
              type="date"
              max={today()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            {t("Peso (kg)")}
            <NumberInput
              className="input mt-2 !w-44"
              min="1"
              step="0.1"
              value={weight}
              onValueChange={setWeight}
              required
            />
          </label>
          <p className="mt-5 text-sm font-bold">
            {t("Medidas corporais (opcional)")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {measurements.map(({ key, label }) => (
              <label key={key} className="text-xs font-semibold text-stone-400">
                {t(label)}
                <input
                  className="input mt-1"
                  type="number"
                  min="0"
                  step="0.1"
                  value={bodyMeasurements[key]}
                  onChange={(event) =>
                    setBodyMeasurements({
                      ...bodyMeasurements,
                      [key]: event.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
          {error && (
            <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-4 py-3 font-bold text-white">
              <Plus size={18} />
              {t(editing ? "Guardar alterações" : "Guardar registo")}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-2xl border border-white/10 px-4 py-3 font-bold text-stone-300 hover:bg-white/5"
              >
                {t("Cancelar")}
              </button>
            )}
          </div>
        </form>
      </div>
      <section className="card mt-6 overflow-hidden bg-white/[0.03]">
        <div className="border-b border-white/10 bg-white/[0.04] p-6">
          <h2 className="font-bold">{t("Registos")}</h2>
        </div>
        {values.length === 0 ? (
          <p className="p-6 text-sm text-stone-400">
            {t("Ainda não existem registos de peso.")}
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {[...values].reverse().map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 p-5 hover:bg-white/[0.03]"
              >
                <div>
                  <p className="font-bold">{entry.weight} kg</p>
                  <p className="mt-1 text-sm text-stone-400">
                    {new Date(
                      `${entry.measured_on}T12:00:00`,
                    ).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {measurements.some(({ key }) => entry[key] != null) && (
                    <p className="mt-2 text-xs text-stone-400">
                      {measurements
                        .filter(({ key }) => entry[key] != null)
                        .map(
                          ({ key, label }) =>
                            `${t(label).replace(" (cm)", "")}: ${entry[key]} cm`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(entry)}
                    className="rounded-xl p-2 text-stone-400 hover:bg-leaf-500/10 hover:text-leaf-700"
                    aria-label={t("Editar registo de progresso")}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    onClick={() => remove(entry.id)}
                    className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-300"
                    aria-label={t("Apagar registo de peso")}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-center">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="mt-1 text-xs uppercase text-stone-400">{label}</p>
    </div>
  );
}
function WeightChart({
  values,
  locale,
}: {
  values: Array<WeightEntry & { weight: number }>;
  locale: string;
}) {
  const { t } = useTranslation();
  if (values.length < 2)
    return (
      <div className="mt-7 grid h-56 place-items-center whitespace-pre-line rounded-2xl bg-white/5 text-center text-sm text-stone-400">
        {t("Adiciona pelo menos dois registos\npara veres o gráfico.")}
      </div>
    );
  const min = Math.min(...values.map((item) => item.weight));
  const max = Math.max(...values.map((item) => item.weight));
  const padding = Math.max((max - min) * 0.2, 0.2);
  const chartMin = min - padding;
  const range = max + padding - chartMin;
  const current = values[values.length - 1].weight;
  const showCurrent = current !== min && current !== max;
  const y = (weight: number) => 92 - ((weight - chartMin) / range) * 76;
  const points = values
    .map(
      (item, index) =>
        `${(index / (values.length - 1)) * 100},${y(item.weight)}`,
    )
    .join(" ");
  return (
    <div className="mt-7">
      <div className="flex h-56 gap-3">
        <div className="flex w-14 shrink-0 flex-col justify-between py-4 text-right text-xs text-stone-400">
          <span>{max.toFixed(1)} kg</span>
          {showCurrent && <span>{current.toFixed(1)} kg</span>}
          <span>{min.toFixed(1)} kg</span>
        </div>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#251a35]"
        >
          <line
            x1="0"
            y1="20"
            x2="100"
            y2="20"
            stroke="currentColor"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
            className="text-white/10"
          />
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
            className="text-white/10"
          />
          <line
            x1="0"
            y1="80"
            x2="100"
            y2="80"
            stroke="currentColor"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
            className="text-white/10"
          />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            className="text-leaf-600"
          />
          {values.map((item, index) => (
            <circle
              key={item.id}
              cx={(index / (values.length - 1)) * 100}
              cy={y(item.weight)}
              r="2.5"
              className="fill-leaf-600"
            />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-stone-400">
        <span className="w-14 shrink-0" />
        <div className="flex flex-1 justify-between">
          <span>
            {new Date(`${values[0].measured_on}T12:00:00`).toLocaleDateString(
              locale,
              { day: "numeric", month: "short" },
            )}
          </span>
          <span>
            {new Date(
              `${values[values.length - 1].measured_on}T12:00:00`,
            ).toLocaleDateString(locale, { day: "numeric", month: "short" })}
          </span>
        </div>
      </div>
    </div>
  );
}

function MeasurementChanges({
  values,
}: {
  values: Array<WeightEntry & { weight: number }>;
}) {
  const { t } = useTranslation();
  const changes = measurements.flatMap(({ key, label }) => {
    const recorded = values
      .filter((entry) => entry[key] != null)
      .map((entry) => Number(entry[key]));
    if (recorded.length < 2) return [];
    const difference = recorded[recorded.length - 1] - recorded[0];
    return [{ label, difference }];
  });
  if (!changes.length) return null;
  return (
    <div className="mt-5">
      <p className="mb-3 text-sm font-bold">{t("Variação das medidas")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {changes.map(({ label, difference }) => (
          <div key={label} className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[11px] text-stone-400">
              {t(label).replace(" (cm)", "")}
            </p>
            <p
              className={`mt-1 text-sm font-bold ${difference < 0 ? "text-emerald-300" : difference > 0 ? "text-amber-300" : "text-stone-300"}`}
            >
              {difference > 0 ? "+" : ""}
              {difference.toFixed(1)} cm
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
