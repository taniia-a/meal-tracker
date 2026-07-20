import {
  AlertCircle,
  CalendarDays,
  Copy,
  PackageOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import NumberInput from "../components/NumberInput";
import { PantryItem } from "../types";
import { useMeals } from "../store/MealContext";
import { nutritionDay } from "../lib/nutrition-day";
import { allowedIngredientUnits } from "../lib/ingredient-units";

export default function PantryPage() {
  const { pantryItems, removePantryItem } = useMeals();
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const today = nutritionDay();
  const expiring = pantryItems.filter(
    (item) =>
      item.expiresOn &&
      item.expiresOn >= today &&
      item.expiresOn <=
        (() => {
          const date = new Date(`${today}T12:00:00`);
          date.setDate(date.getDate() + 7);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        })(),
  );
  const remove = async (id: string) => {
    setError("");
    try {
      await removePantryItem(id);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível apagar o artigo."),
      );
    }
  };
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-semibold text-leaf-600">{t("Planeamento")}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
            {t("Stock")}
          </h1>
          <p className="mt-2 text-stone-400">
            {t(
              "Regista o que tens em casa para darmos prioridade a esses ingredientes nas sugestões.",
            )}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white"
        >
          <Plus size={18} /> {t("Adicionar artigo")}
        </button>
      </div>
      <HouseholdCard />
      {expiring.length > 0 && (
        <div className="mt-7 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          <strong>{t("Atenção à validade")}</strong>
          <p className="mt-1">
            {t("{{count}} artigo(s) terminam nos próximos 7 dias.", {
              count: expiring.length,
            })}
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300"
        >
          {error}
        </p>
      )}
      <section className="card mt-7 overflow-hidden">
        {pantryItems.length ? (
          <div className="divide-y divide-white/10">
            {pantryItems.map((item) => (
              <article key={item.id} className="flex items-center gap-4 p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf-600/15 text-leaf-600">
                  <PackageOpen size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.name}</p>
                  <p className="mt-1 text-sm text-stone-400">
                    {item.quantity} {item.unit}
                    {item.expiresOn && (
                      <>
                        {" "}
                        ·{" "}
                        <span
                          className={
                            expiring.some((value) => value.id === item.id)
                              ? "font-semibold text-amber-200"
                              : ""
                          }
                        >
                          {t("Validade")}:{" "}
                          {new Date(
                            `${item.expiresOn}T12:00:00`,
                          ).toLocaleDateString(
                            i18n.language.startsWith("en") ? "en-GB" : "pt-PT",
                          )}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setEditing(item)}
                  className="rounded-xl p-2 text-stone-400 hover:bg-white/5 hover:text-white"
                  aria-label={t("Editar")}
                >
                  <Pencil size={17} />
                </button>
                <button
                  onClick={() => void remove(item.id)}
                  className="rounded-xl p-2 text-rose-300 hover:bg-rose-500/10"
                  aria-label={t("Remover artigo")}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <PackageOpen className="mx-auto text-leaf-500" size={40} />
            <h2 className="mt-4 text-xl font-bold">
              {t("O teu stock está vazio")}
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              {t(
                "Adiciona ingredientes para os usarmos nas sugestões de receitas.",
              )}
            </p>
          </div>
        )}
      </section>
      {(adding || editing) && (
        <PantryForm
          item={editing ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function HouseholdCard() {
  const { household, createHousehold, joinHousehold } = useMeals();
  const { t } = useTranslation();
  const [householdName, setHouseholdName] = useState("O nosso agregado");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async () => {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await createHousehold(householdName);
      setStatus(t("Agregado criado. O stock atual passou a ser partilhado."));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível criar o agregado."),
      );
    } finally {
      setSaving(false);
    }
  };
  const join = async () => {
    if (!inviteCode.trim()) {
      setError(t("Introduz o código de convite."));
      return;
    }
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await joinHousehold(inviteCode);
      setStatus(
        t("Entraste no agregado. O stock atual passou a ser partilhado."),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível aderir ao agregado."),
      );
    } finally {
      setSaving(false);
    }
  };
  const copyCode = async () => {
    if (!household) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setStatus(t("Código copiado."));
    } catch {
      setError(t("Não foi possível copiar o código."));
    }
  };
  return (
    <section className="card mt-7 p-5">
      <div className="text-center">
        <div>
          <h2 className="font-bold">{t("Stock partilhado")}</h2>
          <p className="mt-1 text-sm text-stone-400">
            {t("Partilha o teu stock com as pessoas que vivem contigo.")}
          </p>
        </div>
      </div>
      {household ? (
        <div className="mt-5 rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-stone-400">{t("Agregado")}</p>
          <p className="mt-1 font-bold">{household.name}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-ink px-3 py-2 font-mono font-bold tracking-widest text-leaf-300">
              {household.inviteCode}
            </div>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold hover:bg-white/5"
            >
              <Copy size={16} /> {t("Copiar código")}
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            {t("Partilha este código com quem deve ter acesso ao mesmo stock.")}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="font-bold">{t("Criar agregado")}</p>
            <input
              className="input mt-3"
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              placeholder={t("Nome do agregado")}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void create()}
              className="mt-3 rounded-xl bg-leaf-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {t("Criar agregado")}
            </button>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="font-bold">{t("Aderir a um agregado")}</p>
            <input
              className="input mt-3 uppercase"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder={t("Código de convite")}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void join()}
              className="mt-3 rounded-xl border border-leaf-500/40 px-4 py-2.5 text-sm font-bold text-leaf-300 disabled:opacity-60"
            >
              {t("Aderir")}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-rose-300">
          {error}
        </p>
      )}
      {status && (
        <p
          role="status"
          className="mt-4 text-sm font-semibold text-emerald-300"
        >
          {status}
        </p>
      )}
    </section>
  );
}

function PantryForm({
  item,
  onClose,
}: {
  item?: PantryItem;
  onClose: () => void;
}) {
  const { savePantryItem } = useMeals();
  const { t } = useTranslation();
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [unit, setUnit] = useState(item?.unit ?? "unidade");
  const [expiresOn, setExpiresOn] = useState(item?.expiresOn ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const units = allowedIngredientUnits(name, false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setError(t("Preenche um nome e uma quantidade válida."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await savePantryItem(
        { name, quantity, unit, expiresOn: expiresOn || null },
        item?.id,
      );
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível guardar o artigo em stock."),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-5 backdrop-blur-sm">
      <form onSubmit={submit} className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-leaf-600">{t("Stock")}</p>
            <h2 className="mt-1 text-xl font-bold">
              {t(item ? "Editar artigo" : "Adicionar artigo")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-white/5"
          >
            <X />
          </button>
        </div>
        <label className="mt-6 block text-sm font-semibold">
          {t("Artigo")}
          <input
            autoFocus
            className="input mt-2"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              const nextUnits = allowedIngredientUnits(nextName, false);
              setName(nextName);
              if (!nextUnits.includes(unit)) setUnit(nextUnits[0]);
            }}
            placeholder={t("Ex.: arroz, iogurte, tomate")}
          />
        </label>
        <div className="mt-4 grid grid-cols-[1fr_9rem] gap-3">
          <label className="text-sm font-semibold">
            {t("Quantidade")}
            <NumberInput
              className="input mt-2"
              min="0.01"
              step="0.01"
              value={quantity}
              onValueChange={setQuantity}
            />
          </label>
          <label className="text-sm font-semibold">
            {t("Unidade")}
            <select
              className="input mt-2"
              value={units.includes(unit) ? unit : units[0]}
              onChange={(event) => setUnit(event.target.value)}
            >
              {units.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          {t("Validade (opcional)")}
          <span className="relative mt-2 block">
            <CalendarDays
              className="pointer-events-none absolute left-4 top-3.5 text-stone-400"
              size={18}
            />
            <input
              className="input !pl-12"
              type="date"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
            />
          </span>
        </label>
        {error && (
          <p className="mt-4 flex gap-2 text-sm font-semibold text-rose-300">
            <AlertCircle size={17} />
            {error}
          </p>
        )}
        <button
          disabled={saving}
          className="mt-6 w-full rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving ? t("A guardar...") : t("Guardar")}
        </button>
      </form>
    </div>
  );
}
