import {
  Bot,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AddMealModal from "../components/AddMealModal";
import { sumMacros } from "../components/NutritionProgress";
import { useMeals } from "../store/MealContext";
import {
  ManualMealInput,
  MealEntry,
  MealType,
  NutritionGoals,
  Recipe,
  WaterEntry,
} from "../types";
import { addShoppingEntryIds } from "../lib/shopping-list";
import { formatLocalDate, nutritionDay } from "../lib/nutrition-day";
import { recipeName } from "../lib/recipe-language";
import { getAuthToken } from "../lib/auth";
import { pantryRecipeMatch } from "../lib/pantry";
import RecipeReviewPrompt from "../components/RecipeReviewPrompt";

const types: MealType[] = ["Pequeno-almoço", "Almoço", "Lanche", "Jantar"];
const formatDateValue = formatLocalDate;
const parseDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
const today = nutritionDay();
const waterEntriesPerPage = 5;

function weekFrom(dateValue: string) {
  const date = parseDateValue(dateValue);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return formatDateValue(day);
  });
}

export default function DiaryPage() {
  const {
    entries,
    recipes,
    profile,
    recipeReviews,
    removeMeal,
    setMealConsumed,
    waterEntries,
    removeWater,
    adjustWater,
  } = useMeals();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<"day" | "week">("day");
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [adding, setAdding] = useState<Recipe | null>(null);
  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [isManualMealModalOpen, setIsManualMealModalOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<MealEntry | null>(null);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [shoppingMessage, setShoppingMessage] = useState("");
  const [isWeekPlanOpen, setIsWeekPlanOpen] = useState(false);
  const [isDayPlanOpen, setIsDayPlanOpen] = useState(false);
  const [reviewRecipe, setReviewRecipe] = useState<Recipe | null>(null);
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (!search.has("pesquisar") && !search.has("manual")) return;
    if (search.has("pesquisar")) setIsRecipePickerOpen(true);
    if (search.has("manual")) setIsManualMealModalOpen(true);
    navigate("/diario", { replace: true });
  }, [location.search, navigate]);
  const daily = entries.filter((entry) => entry.date === date);
  const dailyWater = waterEntries.filter((entry) => entry.date === date);
  const total = sumMacros(daily);
  const week = useMemo(() => weekFrom(date), [date]);
  const locale = i18n.language.startsWith("en") ? "en-GB" : "pt-PT";
  const selectedDateLabel = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDateValue(date));

  const deleteEntry = async (entryId: string) => {
    setDeleteError("");
    try {
      await removeMeal(entryId);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : t("Não foi possível apagar o registo."),
      );
    }
  };
  const deleteWaterEntry = async (entryId: string) => {
    setDeleteError("");
    try {
      await removeWater(entryId);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : t("Não foi possível apagar o registo de água."),
      );
    }
  };
  const markConsumed = async (meal: MealEntry) => {
    setDeleteError("");
    try {
      await setMealConsumed(meal.id, true);
      if (
        !meal.isManual &&
        meal.recipeId &&
        !recipeReviews.some(
          (review) =>
            review.recipeId === meal.recipeId &&
            review.userId === profile.userId,
        )
      ) {
        const recipe = recipes.find((item) => item.id === meal.recipeId);
        if (recipe) setReviewRecipe(recipe);
      }
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : t("Não foi possível atualizar o estado da refeição."),
      );
    }
  };

  const moveWeek = (amount: number) => {
    const next = parseDateValue(week[0]);
    next.setDate(next.getDate() + amount * 7);
    setDate(formatDateValue(next));
  };
  const moveDay = (amount: number) => {
    const next = parseDateValue(date);
    next.setDate(next.getDate() + amount);
    setDate(formatDateValue(next));
  };

  const openDay = (day: string) => {
    setDate(day);
    setView("day");
  };
  const addWeekToShoppingList = () => {
    const entryIds = entries
      .filter((entry) => week.includes(entry.date) && entry.date > today)
      .map((entry) => entry.id);
    if (!entryIds.length) {
      setShoppingMessage(t("Não existem refeições futuras nesta semana."));
      return;
    }
    addShoppingEntryIds(profile.userId, entryIds);
    setShoppingMessage(
      t("{{count}} refeição(ões) adicionada(s) à lista de compras.", {
        count: entryIds.length,
      }),
    );
  };
  const addDayToShoppingList = () => {
    const entryIds = entries
      .filter(
        (entry) =>
          entry.date === date &&
          entry.date >= today &&
          !entry.isConsumed &&
          !entry.isManual,
      )
      .map((entry) => entry.id);
    if (!entryIds.length) {
      setShoppingMessage(t("Não existem refeições planeadas neste dia."));
      return;
    }
    addShoppingEntryIds(profile.userId, entryIds);
    setShoppingMessage(
      t("{{count}} refeição(ões) adicionada(s) à lista de compras.", {
        count: entryIds.length,
      }),
    );
  };
  const entryName = (entry: MealEntry) =>
    i18n.language.startsWith("en") && entry.recipeNameEn
      ? entry.recipeNameEn
      : entry.recipeName;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="font-semibold text-leaf-600">{t("Histórico")}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
            {t("Diário de refeições")}
          </h1>
          <p className="mt-2 text-stone-500">
            {t("Consulta e gere tudo o que registaste.")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            onClick={() => setIsRecipePickerOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf-600 px-4 py-3 text-sm font-bold text-white"
          >
            <Search size={18} /> {t("Pesquisar receitas")}
          </button>
          <button
            onClick={() => setIsManualMealModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-leaf-500/40 px-4 py-3 text-sm font-bold text-leaf-600 hover:bg-leaf-500/10"
          >
            <Plus size={18} /> {t("Refeição manual")}
          </button>
          <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setView("day")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${view === "day" ? "bg-leaf-600 text-white" : "text-stone-400"}`}
            >
              {t("Dia")}
            </button>
            <button
              onClick={() => setView("week")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${view === "week" ? "bg-leaf-600 text-white" : "text-stone-400"}`}
            >
              {t("Semana")}
            </button>
          </div>
        </div>
      </div>

      {deleteError && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm font-semibold text-rose-300"
        >
          {deleteError}
        </p>
      )}
      {shoppingMessage && (
        <p
          role="status"
          className="mt-5 rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300"
        >
          {shoppingMessage}
        </p>
      )}

      {view === "day" ? (
        <>
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setDate(today)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
              >
                {t("Hoje")}
              </button>
              <div className="flex w-full items-center gap-3 sm:w-auto">
                <button
                  type="button"
                  onClick={() => moveDay(-1)}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 hover:bg-white/5"
                  aria-label={t("Dia anterior")}
                >
                  <ChevronLeft size={19} />
                </button>
                <label
                  className="w-[14.5rem] shrink-0"
                  aria-label={t("Selecionar data")}
                >
                  <div className="relative flex h-12 items-center justify-center rounded-xl border border-white/10 bg-[#141019] font-semibold">
                    <span className="pointer-events-none">
                      {selectedDateLabel}
                    </span>
                    <Calendar
                      className="pointer-events-none absolute right-4"
                      size={16}
                    />
                    <input
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => moveDay(1)}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 hover:bg-white/5"
                  aria-label={t("Dia seguinte")}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  onClick={() => setIsDayPlanOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/40 px-4 py-3 text-sm font-bold text-purple-200 hover:bg-purple-500/10 sm:w-auto"
                >
                  <Sparkles size={18} /> {t("Gerar plano")}
                </button>
                <button
                  onClick={addDayToShoppingList}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 px-4 py-3 text-sm font-bold text-white sm:w-auto"
                >
                  <ShoppingCart size={18} /> {t("Adicionar dia às compras")}
                </button>
              </div>
            </div>
          </section>
          <p className="mt-8 text-sm font-bold text-stone-400">
            {t("Totais previstos")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary
              value={Math.round(total.calories)}
              label={t("Calorias")}
              unit="kcal"
            />
            <Summary
              value={Math.round(total.protein)}
              label={t("Proteína")}
              unit="g"
            />
            <Summary
              value={Math.round(total.carbs)}
              label={t("Hidratos")}
              unit="g"
            />
            <Summary
              value={Math.round(total.fat)}
              label={t("Gordura")}
              unit="g"
            />
          </div>
          <WaterLog
            date={date}
            entries={dailyWater}
            onAdd={() => setIsWaterModalOpen(true)}
            onDelete={deleteWaterEntry}
          />
          <div className="mt-6 space-y-4">
            {types.map((type) => {
              const meals = daily.filter((entry) => entry.mealType === type);
              return (
                <section key={type} className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">{t(type)}</h2>
                    <span className="text-sm font-semibold text-stone-400">
                      {Math.round(sumMacros(meals).calories)} kcal
                    </span>
                  </div>
                  {meals.length === 0 ? (
                    <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">
                      {t("Sem registos.")}
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-white/10">
                      {meals.map((meal) => {
                        const consumed = meal.isConsumed;
                        return (
                          <div
                            key={meal.id}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {meal.recipeId ? (
                                  <Link
                                    to={`/receitas/${meal.recipeId}`}
                                    className="font-semibold hover:text-leaf-600 hover:underline"
                                  >
                                    {entryName(meal)}
                                  </Link>
                                ) : (
                                  <p className="font-semibold">
                                    {entryName(meal)}
                                  </p>
                                )}
                                {meal.isManual && (
                                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                                    {t("Manual")}
                                  </span>
                                )}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${consumed ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}
                                >
                                  {t(consumed ? "Consumida" : "Planeada")}
                                </span>
                              </div>
                              <p className="text-xs text-stone-400">
                                {meal.isManual
                                  ? t("Valores introduzidos manualmente.")
                                  : t("{{count}} porção(ões)", {
                                      count: meal.portions,
                                    })}{" "}
                                · P {meal.protein}g · C {meal.carbs}g · F{" "}
                                {meal.fat}g
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="mr-1 text-sm font-bold">
                                {meal.calories} kcal
                              </span>
                              {!consumed && (
                                <button
                                  onClick={() => void markConsumed(meal)}
                                  aria-label={t("Marcar como consumida")}
                                  className="rounded-xl p-2 text-amber-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                                >
                                  <CheckCircle2 size={17} />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  meal.isManual
                                    ? setEditingManual(meal)
                                    : setEditing(meal)
                                }
                                aria-label={t("Editar registo")}
                                className="rounded-xl p-2 text-stone-400 hover:bg-leaf-500/10 hover:text-leaf-700"
                              >
                                <Pencil size={17} />
                              </button>
                              <button
                                onClick={() => deleteEntry(meal.id)}
                                aria-label={t("Remover refeição")}
                                className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <WeeklyView
          week={week}
          entries={entries}
          locale={locale}
          today={today}
          onPrevious={() => moveWeek(-1)}
          onNext={() => moveWeek(1)}
          onCurrent={() => setDate(today)}
          onOpenDay={openDay}
          onAddToShoppingList={addWeekToShoppingList}
          onCreatePlan={() => setIsWeekPlanOpen(true)}
        />
      )}

      {isRecipePickerOpen && (
        <RecipePicker
          recipes={recipes}
          onClose={() => setIsRecipePickerOpen(false)}
          onSelect={(recipe) => {
            setAdding(recipe);
            setIsRecipePickerOpen(false);
          }}
        />
      )}
      {isManualMealModalOpen && (
        <ManualMealModal
          date={date}
          onClose={() => setIsManualMealModalOpen(false)}
        />
      )}
      {editingManual && (
        <ManualMealModal
          entry={editingManual}
          date={editingManual.date}
          onClose={() => setEditingManual(null)}
        />
      )}
      {isWaterModalOpen && (
        <AddWaterModal
          date={date}
          onClose={() => setIsWaterModalOpen(false)}
          onSave={adjustWater}
        />
      )}
      {adding && (
        <AddMealModal
          recipe={adding}
          initialDate={date}
          onClose={() => setAdding(null)}
        />
      )}
      {editing &&
        (() => {
          const recipe = recipes.find((item) => item.id === editing.recipeId);
          return recipe ? (
            <AddMealModal
              recipe={recipe}
              entry={editing}
              onClose={() => setEditing(null)}
            />
          ) : null;
        })()}
      {isWeekPlanOpen && (
        <WeeklyPlanModal week={week} onClose={() => setIsWeekPlanOpen(false)} />
      )}
      {isDayPlanOpen && (
        <DailyPlanModal date={date} onClose={() => setIsDayPlanOpen(false)} />
      )}
      {reviewRecipe && (
        <RecipeReviewPrompt
          recipe={reviewRecipe}
          onClose={() => setReviewRecipe(null)}
        />
      )}
    </div>
  );
}

function WaterLog({
  date,
  entries,
  onAdd,
  onDelete,
}: {
  date: string;
  entries: WaterEntry[];
  onAdd: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [date]);
  const pageCount = Math.max(
    1,
    Math.ceil(entries.length / waterEntriesPerPage),
  );
  const currentPage = Math.min(page, pageCount);
  const visibleEntries = entries.slice(
    (currentPage - 1) * waterEntriesPerPage,
    currentPage * waterEntriesPerPage,
  );
  return (
    <section className="card mt-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
            <Droplets size={20} />
          </div>
          <div>
            <h2 className="font-bold">{t("Água")}</h2>
            <p className="text-sm text-stone-400">
              {t("{{count}} movimento(s)", { count: entries.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-lg font-extrabold text-sky-300">
            {entries.reduce((sum, entry) => sum + entry.amountMl, 0)} ml
          </span>
          <button
            onClick={onAdd}
            className="inline-flex shrink-0 items-center rounded-xl border border-sky-400/40 px-3 py-2 text-sm font-bold text-sky-300 hover:bg-sky-500/10"
          >
            {t("Adicionar água")}
          </button>
        </div>
      </div>
      {entries.length ? (
        <>
          <div className="mt-3 divide-y divide-white/10">
            {visibleEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-3"
              >
                <span className="font-semibold">+{entry.amountMl} ml</span>
                <button
                  onClick={() => void onDelete(entry.id)}
                  aria-label={t("Apagar registo de água")}
                  className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          {entries.length > waterEntriesPerPage && (
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-white/10 pt-4">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40"
              >
                {t("Anterior")}
              </button>
              <span className="text-sm text-stone-400">
                {t("Página {{page}} de {{total}}", {
                  page: currentPage,
                  total: pageCount,
                })}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40"
              >
                {t("Seguinte")}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">
          {t("Ainda não registaste água neste dia.")}
        </p>
      )}
    </section>
  );
}

function AddWaterModal({
  date,
  onClose,
  onSave,
}: {
  date: string;
  onClose: () => void;
  onSave: (amountMl: number, entryDate: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("100");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountMl = Number(amount);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      setError(t("Introduz uma quantidade de água válida."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(amountMl, date);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível atualizar a água."),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-400">{t("Água")}</p>
            <h2 className="mt-1 text-xl font-bold">{t("Adicionar água")}</h2>
            <p className="mt-1 text-sm text-stone-400">{date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/5"
            aria-label={t("Cancelar")}
          >
            <X />
          </button>
        </div>
        <label className="mt-6 block text-sm font-semibold">
          {t("Quantidade de água (ml)")}
          <div className="relative mt-2">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="input pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-3.5 text-sm text-stone-400">
              ml
            </span>
          </div>
        </label>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-rose-400">
            {error}
          </p>
        )}
        <button
          disabled={saving || !amount}
          className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving ? t("A guardar...") : t("Adicionar água")}
        </button>
      </form>
    </div>
  );
}

function ManualMealModal({
  date,
  entry,
  onClose,
}: {
  date: string;
  entry?: MealEntry;
  onClose: () => void;
}) {
  const { addManualMeal, updateManualMeal } = useMeals();
  const { t } = useTranslation();
  const [name, setName] = useState(entry?.recipeName ?? "");
  const [entryDate, setEntryDate] = useState(entry?.date ?? date);
  const [mealType, setMealType] = useState<MealType>(
    entry?.mealType ?? "Almoço",
  );
  const [calories, setCalories] = useState(entry ? String(entry.calories) : "");
  const [protein, setProtein] = useState(
    entry?.protein ? String(entry.protein) : "",
  );
  const [carbs, setCarbs] = useState(entry?.carbs ? String(entry.carbs) : "");
  const [fat, setFat] = useState(entry?.fat ? String(entry.fat) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [estimating, setEstimating] = useState(false);
  const toNumber = (value: string) => (value === "" ? 0 : Number(value));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const caloriesValue = Number(calories);
    if (!name.trim() || !Number.isFinite(caloriesValue) || caloriesValue <= 0) {
      setError(t("Indica o nome e as calorias da refeição."));
      return;
    }
    const meal: ManualMealInput = {
      name,
      date: entryDate,
      mealType,
      calories: caloriesValue,
      protein: toNumber(protein),
      carbs: toNumber(carbs),
      fat: toNumber(fat),
    };
    if (![meal.protein, meal.carbs, meal.fat].every(Number.isFinite)) {
      setError(t("Introduz valores nutricionais válidos."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (entry) await updateManualMeal(entry.id, meal);
      else await addManualMeal(meal);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível registar a refeição."),
      );
    } finally {
      setSaving(false);
    }
  };
  const estimateWithAi = async () => {
    if (!aiDescription.trim()) {
      setError(t("Descreve primeiro o que comeste."));
      return;
    }
    setEstimating(true);
    setError("");
    setAiNote("");
    try {
      const token = await getAuthToken();
      if (!token)
        throw new Error(t("A tua sessão expirou. Inicia sessão novamente."));
      const response = await fetch("/api/meal-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          description: aiDescription,
          language: document.documentElement.lang,
        }),
      });
      const text = await response.text();
      let data: {
        name?: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        note?: string;
        error?: string;
      };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error(
          t(
            "A estimativa por IA só está disponível no ambiente Vercel. Faz deploy ou inicia com vercel dev.",
          ),
        );
      }
      if (!response.ok || !data.name)
        throw new Error(
          data.error || t("Não foi possível obter uma estimativa agora."),
        );
      setName(data.name);
      setCalories(String(data.calories ?? ""));
      setProtein(data.protein ? String(data.protein) : "");
      setCarbs(data.carbs ? String(data.carbs) : "");
      setFat(data.fat ? String(data.fat) : "");
      setAiNote(data.note ?? "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível obter uma estimativa agora."),
      );
    } finally {
      setEstimating(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-5 backdrop-blur-sm">
      <form onSubmit={submit} className="card my-5 w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-leaf-600">{t("Diário")}</p>
            <h2 className="mt-1 text-xl font-bold">{t("Refeição manual")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/5"
            aria-label={t("Cancelar")}
          >
            <X />
          </button>
        </div>
        <section className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4">
          <div className="flex items-center gap-2">
            <Bot className="text-purple-300" size={18} />
            <p className="font-bold text-purple-100">{t("Estimar com IA")}</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-300">
            {t(
              "Descreve o que comeste e a IA preenche uma estimativa que podes alterar antes de guardar.",
            )}
          </p>
          <textarea
            className="input mt-3 min-h-24 resize-y"
            value={aiDescription}
            onChange={(event) => setAiDescription(event.target.value)}
            placeholder={t(
              "Ex.: comi uma sandes de frango grelhado com queijo e um galão.",
            )}
            maxLength={1500}
          />
          <button
            type="button"
            disabled={estimating || !aiDescription.trim()}
            onClick={() => void estimateWithAi()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            <Sparkles size={16} />{" "}
            {estimating ? t("A estimar...") : t("Estimar valores")}
          </button>
          {aiNote && <p className="mt-3 text-xs text-stone-300">{aiNote}</p>}
        </section>
        <label className="mt-5 block text-sm font-semibold">
          {t("Dia da refeição")}
          <input
            className="meal-entry-date input mt-2"
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("Nome da refeição")}
          <input
            autoFocus
            className="input mt-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("Tipo de refeição")}
          <select
            className="input mt-2"
            value={mealType}
            onChange={(event) => setMealType(event.target.value as MealType)}
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {t(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("Calorias")}
          <div className="relative mt-2">
            <input
              className="input pr-12"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              required
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
            />
            <span className="pointer-events-none absolute right-4 top-3.5 text-sm text-stone-400">
              kcal
            </span>
          </div>
        </label>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MacroInput label="Proteína" value={protein} onChange={setProtein} />
          <MacroInput label="Hidratos" value={carbs} onChange={setCarbs} />
          <MacroInput label="Gordura" value={fat} onChange={setFat} />
        </div>
        <p className="mt-3 text-xs text-stone-400">
          {t(
            "Os macros são opcionais. Se não os souberes, podes deixar em branco.",
          )}
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-rose-400">
            {error}
          </p>
        )}
        <button
          disabled={saving}
          className="mt-6 w-full rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving
            ? t("A guardar...")
            : t(entry ? "Guardar alterações" : "Adicionar ao diário")}
        </button>
      </form>
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="text-xs font-semibold text-stone-400">
      {t(label)}
      <div className="relative mt-2">
        <input
          className="input px-3 py-2 pr-7"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="pointer-events-none absolute right-2 top-2.5 text-[10px] text-stone-400">
          g
        </span>
      </div>
    </label>
  );
}

function RecipePicker({
  recipes,
  onClose,
  onSelect,
}: {
  recipes: Recipe[];
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const normalise = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const terms = normalise(query).trim().split(/\s+/).filter(Boolean);
  const filtered = recipes
    .filter((recipe) => {
      const searchable = [
        recipe.name,
        recipe.nameEn,
        ...recipe.ingredients,
        ...recipe.ingredientsEn,
      ].map(normalise);
      return terms.every((term) =>
        searchable.some((value) => value.includes(term)),
      );
    })
    .slice(0, 30);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm">
      <section className="card flex max-h-[80vh] w-full max-w-xl flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-leaf-600">{t("Diário")}</p>
            <h2 className="mt-1 text-xl font-bold">
              {t("Adicionar refeição")}
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              {t("Pesquisa uma receita para registar no diário.")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/5"
            aria-label={t("Cancelar")}
          >
            <X />
          </button>
        </div>
        <label className="relative mt-5">
          <Search
            className="absolute left-4 top-3.5 text-stone-400"
            size={19}
          />
          <input
            autoFocus
            className="input !pl-12"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Ex.: frango, aveia, salmão...")}
          />
        </label>
        <div className="mt-4 min-h-0 space-y-2 overflow-y-auto pr-1">
          {filtered.length ? (
            filtered.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => onSelect(recipe)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 p-4 text-left transition hover:border-leaf-500/50 hover:bg-white/5"
              >
                <div>
                  <p className="font-bold">
                    {recipeName(recipe, i18n.language)}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {Math.round(recipe.calories)} kcal · P{" "}
                    {Math.round(recipe.protein)}g · C {Math.round(recipe.carbs)}
                    g · G {Math.round(recipe.fat)}g
                  </p>
                </div>
                <Plus className="shrink-0 text-leaf-600" size={20} />
              </button>
            ))
          ) : (
            <p className="rounded-2xl bg-white/5 p-5 text-center text-sm text-stone-400">
              {t("Nenhuma receita encontrada.")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

type PlannedMeal = {
  date: string;
  mealType: MealType;
  recipe: Recipe;
  portions: number;
};

function WeeklyPlanModal({
  week,
  onClose,
}: {
  week: string[];
  onClose: () => void;
}) {
  const {
    recipes,
    entries,
    goals,
    profile,
    pantryItems,
    recipeReviews,
    addMeal,
  } = useMeals();
  const { t, i18n } = useTranslation();
  const [version, setVersion] = useState(0);
  const [previousOptionRecipeIds, setPreviousOptionRecipeIds] = useState<
    Set<string>
  >(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const plan = useMemo(
    () =>
      buildWeeklyPlan(
        week,
        recipes,
        entries,
        goals,
        profile.dislikedIngredients,
        profile.userId,
        recipeReviews,
        pantryItems,
        version,
        previousOptionRecipeIds,
      ),
    [
      week,
      recipes,
      entries,
      goals,
      profile.dislikedIngredients,
      profile.userId,
      recipeReviews,
      pantryItems,
      version,
      previousOptionRecipeIds,
    ],
  );
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      for (const item of plan)
        await addMeal(item.recipe, item.mealType, item.portions, item.date);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível gerar o plano."),
      );
    } finally {
      setSaving(false);
    }
  };
  const generateAnother = () => {
    setPreviousOptionRecipeIds(new Set(plan.map((item) => item.recipe.id)));
    setVersion((current) => current + 1);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-5 backdrop-blur-sm">
      <section className="card my-5 w-full max-w-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-300">
              {t("Planeamento automático")}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">
              {t("Gerar plano da semana")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              {t(
                "Vamos preencher apenas refeições futuras em falta, com base nas tuas metas e preferências.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/5"
            aria-label={t("Cancelar")}
          >
            <X />
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-sm text-purple-100">
          <p className="font-bold">
            {t("{{count}} refeições serão planeadas", { count: plan.length })}
          </p>
          <p className="mt-1 text-xs text-stone-300">
            {t(
              "Não alteramos refeições que já existam e ignoramos ingredientes a evitar.",
            )}
          </p>
        </div>
        {plan.length ? (
          <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
            {plan.map((item, index) => (
              <div
                key={`${item.date}-${item.mealType}-${index}`}
                className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-3"
              >
                <div>
                  <p className="font-bold">
                    {i18n.language.startsWith("en") && item.recipe.nameEn
                      ? item.recipe.nameEn
                      : item.recipe.name}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {parseDateValue(item.date).toLocaleDateString(
                      i18n.language.startsWith("en") ? "en-GB" : "pt-PT",
                      { weekday: "short", day: "numeric", month: "short" },
                    )}{" "}
                    · {t(item.mealType)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-stone-300">
                  {item.portions}× ·{" "}
                  {Math.round(item.recipe.calories * item.portions)} kcal
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-white/5 p-5 text-sm text-stone-400">
            {t(
              "Não há refeições futuras em falta nesta semana ou não encontrámos receitas compatíveis.",
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-rose-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={generateAnother}
            disabled={saving || !plan.length}
            className="rounded-2xl border border-white/15 px-5 py-3 font-bold hover:bg-white/5 disabled:opacity-60"
          >
            {t("Gerar outra opção")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !plan.length}
            className="rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? t("A guardar...") : t("Criar plano")}
          </button>
        </div>
      </section>
    </div>
  );
}

function DailyPlanModal({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const {
    recipes,
    entries,
    goals,
    profile,
    pantryItems,
    recipeReviews,
    addMeal,
  } = useMeals();
  const { t, i18n } = useTranslation();
  const [version, setVersion] = useState(0);
  const [previousOptionRecipeIds, setPreviousOptionRecipeIds] = useState<
    Set<string>
  >(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const plan = useMemo(
    () =>
      buildDailyPlan(
        date,
        recipes,
        entries,
        goals,
        profile.dislikedIngredients,
        profile.userId,
        recipeReviews,
        pantryItems,
        version,
        previousOptionRecipeIds,
      ),
    [
      date,
      recipes,
      entries,
      goals,
      profile.dislikedIngredients,
      profile.userId,
      recipeReviews,
      pantryItems,
      version,
      previousOptionRecipeIds,
    ],
  );
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      for (const item of plan)
        await addMeal(item.recipe, item.mealType, item.portions, item.date);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível gerar o plano."),
      );
    } finally {
      setSaving(false);
    }
  };
  const generateAnother = () => {
    setPreviousOptionRecipeIds(new Set(plan.map((item) => item.recipe.id)));
    setVersion((current) => current + 1);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-5 backdrop-blur-sm">
      <section className="card my-5 w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-300">
              {t("Planeamento automático")}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">{t("Sugerir dia")}</h2>
            <p className="mt-2 text-sm text-stone-400">
              {t(
                "Vamos preencher apenas as refeições em falta deste dia, com base nas tuas metas e preferências.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/5"
            aria-label={t("Cancelar")}
          >
            <X />
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4 text-sm text-purple-100">
          <p className="font-bold">
            {t("{{count}} refeições serão planeadas", { count: plan.length })}
          </p>
          <p className="mt-1 text-xs text-stone-300">
            {t(
              "Não alteramos refeições que já existam e ignoramos ingredientes a evitar.",
            )}
          </p>
        </div>
        {plan.length ? (
          <div className="mt-5 space-y-2">
            {plan.map((item) => (
              <div
                key={item.mealType}
                className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-3"
              >
                <div>
                  <p className="font-bold">
                    {i18n.language.startsWith("en") && item.recipe.nameEn
                      ? item.recipe.nameEn
                      : item.recipe.name}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {t(item.mealType)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-stone-300">
                  {item.portions}× ·{" "}
                  {Math.round(item.recipe.calories * item.portions)} kcal
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-white/5 p-5 text-sm text-stone-400">
            {t(
              "Não há refeições em falta neste dia ou não encontrámos receitas compatíveis.",
            )}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-rose-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={generateAnother}
            disabled={saving || !plan.length}
            className="rounded-2xl border border-white/15 px-5 py-3 font-bold hover:bg-white/5 disabled:opacity-60"
          >
            {t("Gerar outra opção")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !plan.length}
            className="rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? t("A guardar...") : t("Criar plano")}
          </button>
        </div>
      </section>
    </div>
  );
}

function buildDailyPlan(
  date: string,
  recipes: Recipe[],
  entries: MealEntry[],
  goals: NutritionGoals,
  dislikedIngredients: string[],
  userId: string,
  reviews: ReturnType<typeof useMeals>["recipeReviews"],
  pantryItems: ReturnType<typeof useMeals>["pantryItems"],
  version: number,
  previousOptionRecipeIds: Set<string> = new Set(),
): PlannedMeal[] {
  if (date < nutritionDay()) return [];
  const normalise = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const dislikes = dislikedIngredients.map(normalise).filter(Boolean);
  const categoryMatches = (recipe: Recipe, mealType: MealType) =>
    mealType === "Pequeno-almoço"
      ? recipe.category === "Pequeno Almoço"
      : mealType === "Lanche"
        ? ["Snacks", "Sobremesas"].includes(recipe.category)
        : recipe.category === "Almoço/Jantar";
  const shares: Record<MealType, number> = {
    "Pequeno-almoço": 0.25,
    Almoço: 0.35,
    Lanche: 0.15,
    Jantar: 0.25,
  };
  const dayEntries = entries.filter((entry) => entry.date === date);
  const missing = types.filter(
    (type) => !dayEntries.some((entry) => entry.mealType === type),
  );
  const todayTotals = sumMacros(dayEntries);
  const cutoffDate = new Date(`${nutritionDay()}T12:00:00`);
  cutoffDate.setDate(cutoffDate.getDate() - 28);
  const recent = new Set(
    entries
      .filter(
        (entry) =>
          entry.recipeId &&
          entry.date >= formatDateValue(cutoffDate) &&
          entry.date <= nutritionDay(),
      )
      .map((entry) => entry.recipeId),
  );
  const planned = new Set(
    entries
      .filter(
        (entry) =>
          entry.recipeId && !entry.isConsumed && entry.date >= nutritionDay(),
      )
      .map((entry) => entry.recipeId),
  );
  const used = new Set(
    dayEntries.map((entry) => entry.recipeId).filter(Boolean),
  );
  const ratings = new Map(
    reviews
      .filter((review) => review.userId === userId)
      .map((review) => [review.recipeId, review.rating]),
  );
  let remainingShare = missing.reduce((sum, type) => sum + shares[type], 0);
  let remaining = {
    calories: Math.max(0, goals.calories - todayTotals.calories),
    protein: Math.max(0, goals.protein - todayTotals.protein),
    carbs: Math.max(0, goals.carbs - todayTotals.carbs),
    fat: Math.max(0, goals.fat - todayTotals.fat),
  };
  return missing.flatMap((mealType) => {
    const targetShare = shares[mealType] / remainingShare;
    const target = {
      calories: remaining.calories * targetShare,
      protein: remaining.protein * targetShare,
      carbs: remaining.carbs * targetShare,
      fat: remaining.fat * targetShare,
    };
    const eligibleRecipes = recipes.filter((recipe) => {
      const containsDisliked = [
        ...recipe.ingredients,
        ...recipe.ingredientsEn,
      ].some((ingredient) =>
        dislikes.some(
          (item) =>
            normalise(ingredient).includes(item) ||
            item.includes(normalise(ingredient)),
        ),
      );
      return (
        categoryMatches(recipe, mealType) &&
        recipe.calories > 0 &&
        !recent.has(recipe.id) &&
        !planned.has(recipe.id) &&
        !used.has(recipe.id) &&
        !containsDisliked
      );
    });
    const recipesForChoice = eligibleRecipes.filter(
      (recipe) => !previousOptionRecipeIds.has(recipe.id),
    ).length
      ? eligibleRecipes.filter(
          (recipe) => !previousOptionRecipeIds.has(recipe.id),
        )
      : eligibleRecipes;
    const choices = recipesForChoice
      .map((recipe) => {
        const portions = Math.max(
          0.25,
          Math.min(4, Math.round((target.calories / recipe.calories) * 4) / 4),
        );
        const score =
          Math.abs(recipe.protein * portions - target.protein) /
            Math.max(goals.protein, 1) +
          Math.abs(recipe.carbs * portions - target.carbs) /
            Math.max(goals.carbs, 1) +
          Math.abs(recipe.fat * portions - target.fat) /
            Math.max(goals.fat, 1) -
          (ratings.get(recipe.id) ?? 0) * 0.08 -
          pantryRecipeMatch(recipe, pantryItems).score;
        return { recipe, portions, score };
      })
      .sort(
        (a, b) =>
          a.score - b.score ||
          ((a.recipe.id.charCodeAt(0) + version) % 7) -
            ((b.recipe.id.charCodeAt(0) + version) % 7),
      );
    const choice = choices[0];
    remainingShare -= shares[mealType];
    if (!choice) return [];
    used.add(choice.recipe.id);
    remaining = {
      calories: Math.max(
        0,
        remaining.calories - choice.recipe.calories * choice.portions,
      ),
      protein: Math.max(
        0,
        remaining.protein - choice.recipe.protein * choice.portions,
      ),
      carbs: Math.max(
        0,
        remaining.carbs - choice.recipe.carbs * choice.portions,
      ),
      fat: Math.max(0, remaining.fat - choice.recipe.fat * choice.portions),
    };
    return [
      { date, mealType, recipe: choice.recipe, portions: choice.portions },
    ];
  });
}

function buildWeeklyPlan(
  week: string[],
  recipes: Recipe[],
  entries: MealEntry[],
  goals: NutritionGoals,
  dislikedIngredients: string[],
  userId: string,
  reviews: ReturnType<typeof useMeals>["recipeReviews"],
  pantryItems: ReturnType<typeof useMeals>["pantryItems"],
  version: number,
  previousOptionRecipeIds: Set<string> = new Set(),
): PlannedMeal[] {
  const normalise = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const dislikes = dislikedIngredients.map(normalise).filter(Boolean);
  const includesDisliked = (recipe: Recipe) =>
    [...recipe.ingredients, ...recipe.ingredientsEn].some((ingredient) =>
      dislikes.some(
        (item) =>
          normalise(ingredient).includes(item) ||
          item.includes(normalise(ingredient)),
      ),
    );
  const shares: Record<MealType, number> = {
    "Pequeno-almoço": 0.25,
    Almoço: 0.35,
    Lanche: 0.15,
    Jantar: 0.25,
  };
  const categoryMatches = (recipe: Recipe, mealType: MealType) =>
    mealType === "Pequeno-almoço"
      ? recipe.category === "Pequeno Almoço"
      : mealType === "Lanche"
        ? ["Snacks", "Sobremesas"].includes(recipe.category)
        : recipe.category === "Almoço/Jantar";
  const available = (mealType: MealType) =>
    recipes.filter(
      (recipe) =>
        categoryMatches(recipe, mealType) &&
        recipe.calories > 0 &&
        !includesDisliked(recipe),
    );
  const plan: PlannedMeal[] = [];
  const fourWeeksAgo = new Date(`${nutritionDay()}T12:00:00`);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentCutoff = formatDateValue(fourWeeksAgo);
  const recentlyUsedRecipeIds = new Set(
    entries
      .filter(
        (entry) =>
          entry.recipeId &&
          entry.date >= recentCutoff &&
          entry.date <= nutritionDay(),
      )
      .map((entry) => entry.recipeId),
  );
  const usedAcrossWeek = new Set(
    entries
      .filter((entry) => week.includes(entry.date) && entry.recipeId)
      .map((entry) => entry.recipeId),
  );
  const userRatings = new Map(
    reviews
      .filter((review) => review.userId === userId)
      .map((review) => [review.recipeId, review.rating]),
  );
  for (const day of week.filter((item) => item > nutritionDay())) {
    const dayEntries = entries.filter((entry) => entry.date === day);
    const current = sumMacros(dayEntries);
    const missingTypes = types.filter(
      (mealType) => !dayEntries.some((entry) => entry.mealType === mealType),
    );
    let remainingShare = missingTypes.reduce(
      (sum, mealType) => sum + shares[mealType],
      0,
    );
    const usedRecipeIds = new Set(
      dayEntries.map((entry) => entry.recipeId).filter(Boolean),
    );
    let remaining = {
      calories: Math.max(0, goals.calories - current.calories),
      protein: Math.max(0, goals.protein - current.protein),
      carbs: Math.max(0, goals.carbs - current.carbs),
      fat: Math.max(0, goals.fat - current.fat),
    };
    for (const mealType of missingTypes) {
      const share = shares[mealType] / remainingShare;
      const target = {
        calories: remaining.calories * share,
        protein: remaining.protein * share,
        carbs: remaining.carbs * share,
        fat: remaining.fat * share,
      };
      const compatibleRecipes = available(mealType);
      const eligibleRecipes = compatibleRecipes.filter(
        (recipe) =>
          !recentlyUsedRecipeIds.has(recipe.id) &&
          !usedAcrossWeek.has(recipe.id) &&
          !usedRecipeIds.has(recipe.id),
      );
      // A new option deliberately avoids every recipe shown in the immediately
      // previous preview. If a category has no alternative, fall back so the
      // plan can still be completed.
      const candidateRecipes = eligibleRecipes.filter(
        (recipe) => !previousOptionRecipeIds.has(recipe.id),
      );
      const recipesForChoice = candidateRecipes.length
        ? candidateRecipes
        : eligibleRecipes;
      const candidates = recipesForChoice
        .map((recipe) => {
          const portions = Math.max(
            0.25,
            Math.min(
              4,
              Math.round((target.calories / recipe.calories) * 4) / 4,
            ),
          );
          const userRating = userRatings.get(recipe.id) ?? 0;
          const score =
            Math.abs(recipe.protein * portions - target.protein) /
              Math.max(goals.protein, 1) +
            Math.abs(recipe.carbs * portions - target.carbs) /
              Math.max(goals.carbs, 1) +
            Math.abs(recipe.fat * portions - target.fat) /
              Math.max(goals.fat, 1) -
            userRating * 0.08 -
            pantryRecipeMatch(recipe, pantryItems).score;
          return { recipe, portions, score };
        })
        .sort(
          (first, second) =>
            first.score - second.score ||
            ((first.recipe.id.charCodeAt(0) + version) % 7) -
              ((second.recipe.id.charCodeAt(0) + version) % 7),
        );
      const choice = candidates[0];
      if (!choice) {
        remainingShare -= shares[mealType];
        continue;
      }
      plan.push({
        date: day,
        mealType,
        recipe: choice.recipe,
        portions: choice.portions,
      });
      usedRecipeIds.add(choice.recipe.id);
      usedAcrossWeek.add(choice.recipe.id);
      remaining = {
        calories: Math.max(
          0,
          remaining.calories - choice.recipe.calories * choice.portions,
        ),
        protein: Math.max(
          0,
          remaining.protein - choice.recipe.protein * choice.portions,
        ),
        carbs: Math.max(
          0,
          remaining.carbs - choice.recipe.carbs * choice.portions,
        ),
        fat: Math.max(0, remaining.fat - choice.recipe.fat * choice.portions),
      };
      remainingShare -= shares[mealType];
    }
  }
  return plan;
}

function findReplacementRecipe(
  meal: MealEntry,
  recipes: Recipe[],
  entries: MealEntry[],
  dislikedIngredients: string[],
  userId: string,
  reviews: ReturnType<typeof useMeals>["recipeReviews"],
): { recipe: Recipe; portions: number } | null {
  const normalise = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const dislikes = dislikedIngredients.map(normalise).filter(Boolean);
  const fourWeeksAgo = new Date(`${nutritionDay()}T12:00:00`);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const cutoff = formatDateValue(fourWeeksAgo);
  const recentlyUsed = new Set(
    entries
      .filter(
        (entry) =>
          entry.recipeId &&
          entry.date >= cutoff &&
          entry.date <= nutritionDay(),
      )
      .map((entry) => entry.recipeId),
  );
  const mealDate = parseDateValue(meal.date);
  const weekStart = new Date(mealDate);
  weekStart.setDate(mealDate.getDate() - ((mealDate.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const plannedThisWeek = new Set(
    entries
      .filter(
        (entry) =>
          entry.recipeId &&
          entry.date >= formatDateValue(weekStart) &&
          entry.date <= formatDateValue(weekEnd),
      )
      .map((entry) => entry.recipeId),
  );
  const ratings = new Map(
    reviews
      .filter((review) => review.userId === userId)
      .map((review) => [review.recipeId, review.rating]),
  );
  const categoryMatches = (recipe: Recipe) =>
    meal.mealType === "Pequeno-almoço"
      ? recipe.category === "Pequeno Almoço"
      : meal.mealType === "Lanche"
        ? ["Snacks", "Sobremesas"].includes(recipe.category)
        : recipe.category === "Almoço/Jantar";
  const candidates = recipes
    .filter((recipe) => {
      const containsDisliked = [
        ...recipe.ingredients,
        ...recipe.ingredientsEn,
      ].some((ingredient) =>
        dislikes.some(
          (item) =>
            normalise(ingredient).includes(item) ||
            item.includes(normalise(ingredient)),
        ),
      );
      return (
        recipe.id !== meal.recipeId &&
        recipe.calories > 0 &&
        categoryMatches(recipe) &&
        !recentlyUsed.has(recipe.id) &&
        !plannedThisWeek.has(recipe.id) &&
        !containsDisliked
      );
    })
    .map((recipe) => {
      const portions = Math.max(
        0.25,
        Math.min(4, Math.round((meal.calories / recipe.calories) * 4) / 4),
      );
      const score =
        Math.abs(recipe.calories * portions - meal.calories) /
          Math.max(meal.calories, 1) +
        Math.abs(recipe.protein * portions - meal.protein) /
          Math.max(meal.protein, 1) +
        Math.abs(recipe.carbs * portions - meal.carbs) /
          Math.max(meal.carbs, 1) +
        Math.abs(recipe.fat * portions - meal.fat) / Math.max(meal.fat, 1) -
        (ratings.get(recipe.id) ?? 0) * 0.08;
      return { recipe, portions, score };
    })
    .sort((first, second) => first.score - second.score);
  return candidates[0]
    ? { recipe: candidates[0].recipe, portions: candidates[0].portions }
    : null;
}

function WeeklyView({
  week,
  entries,
  locale,
  today: currentDay,
  onPrevious,
  onNext,
  onCurrent,
  onOpenDay,
  onAddToShoppingList,
  onCreatePlan,
}: {
  week: string[];
  entries: MealEntry[];
  locale: string;
  today: string;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
  onOpenDay: (day: string) => void;
  onAddToShoppingList: () => void;
  onCreatePlan: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { moveMeal, replaceMeal, recipes, profile, recipeReviews } = useMeals();
  const [draggedMeal, setDraggedMeal] = useState<MealEntry | null>(null);
  const [moveError, setMoveError] = useState("");
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const move = async (date: string, mealType: MealType) => {
    if (
      !draggedMeal ||
      (draggedMeal.date === date && draggedMeal.mealType === mealType)
    )
      return;
    setMoveError("");
    try {
      await moveMeal(draggedMeal.id, date, mealType);
    } catch (reason) {
      setMoveError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível mover a refeição."),
      );
    } finally {
      setDraggedMeal(null);
    }
  };
  const swap = async (meal: MealEntry) => {
    setMoveError("");
    setSwappingId(meal.id);
    try {
      const replacement = findReplacementRecipe(
        meal,
        recipes,
        entries,
        profile.dislikedIngredients,
        profile.userId,
        recipeReviews,
      );
      if (!replacement)
        throw new Error(
          t("Não encontrámos outra receita compatível para esta refeição."),
        );
      await replaceMeal(meal.id, replacement.recipe, replacement.portions);
    } catch (reason) {
      setMoveError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível trocar a receita."),
      );
    } finally {
      setSwappingId(null);
    }
  };
  const first = parseDateValue(week[0]);
  const last = parseDateValue(week[6]);
  const range = `${first.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${last.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onCurrent}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
        >
          {t("Semana atual")}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious}
            className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 hover:bg-white/5"
            aria-label={t("Semana anterior")}
          >
            <ChevronLeft size={19} />
          </button>
          <h2 className="min-w-[14.5rem] rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center font-bold capitalize">
            {range}
          </h2>
          <button
            onClick={onNext}
            className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 hover:bg-white/5"
            aria-label={t("Semana seguinte")}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={onCreatePlan}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/40 px-4 py-3 text-sm font-bold text-purple-200 hover:bg-purple-500/10 sm:w-auto"
          >
            <Sparkles size={18} /> {t("Gerar plano")}
          </button>
          <button
            onClick={onAddToShoppingList}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 px-4 py-3 text-sm font-bold text-white sm:w-auto"
          >
            <ShoppingCart size={18} /> {t("Adicionar semana às compras")}
          </button>
        </div>
      </div>
      {moveError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300"
        >
          {moveError}
        </p>
      )}
      <p className="mt-4 text-xs text-stone-400">
        {t("Arrasta uma refeição para outro dia ou tipo de refeição.")}
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {week.map((day) => {
          const meals = entries.filter((entry) => entry.date === day);
          const total = sumMacros(meals);
          const date = parseDateValue(day);
          return (
            <article
              key={day}
              className={`card flex min-h-72 flex-col p-4 ${day === currentDay ? "border-leaf-500/50 ring-1 ring-leaf-500/20" : ""}`}
            >
              <button onClick={() => onOpenDay(day)} className="text-left">
                <p className="text-xs font-bold uppercase text-leaf-700">
                  {date.toLocaleDateString(locale, { weekday: "short" })}
                </p>
                <p className="mt-1 text-2xl font-extrabold">{date.getDate()}</p>
              </button>
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <p className="font-bold">{Math.round(total.calories)} kcal</p>
                <p className="mt-1 text-[10px] text-stone-400">
                  P {Math.round(total.protein)}g · C {Math.round(total.carbs)}g
                  · F {Math.round(total.fat)}g
                </p>
              </div>
              <div className="mt-3 flex-1 space-y-2">
                {types.map((mealType) => {
                  const slotMeals = meals.filter(
                    (meal) => meal.mealType === mealType,
                  );
                  const isTarget = draggedMeal
                    ? draggedMeal.date !== day ||
                      draggedMeal.mealType !== mealType
                    : false;
                  return (
                    <div
                      key={mealType}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        void move(day, mealType);
                      }}
                      className={`min-h-12 rounded-xl border p-2 transition ${isTarget ? "border-purple-400/60 bg-purple-500/10" : "border-white/5 bg-white/[0.02]"}`}
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase text-stone-500">
                        {t(mealType)}
                      </p>
                      {slotMeals.length ? (
                        slotMeals.map((meal) => (
                          <div
                            key={meal.id}
                            draggable
                            onDragStart={() => setDraggedMeal(meal)}
                            onDragEnd={() => setDraggedMeal(null)}
                            className={`flex items-center gap-1 rounded-lg p-1 ${meal.isConsumed ? "bg-emerald-500/10" : "bg-amber-500/10"} ${draggedMeal?.id === meal.id ? "opacity-40" : ""}`}
                          >
                            <button
                              onClick={() => onOpenDay(day)}
                              className="min-w-0 flex-1 p-1 text-left"
                            >
                              <span className="block truncate text-xs font-bold">
                                {i18n.language.startsWith("en") &&
                                meal.recipeNameEn
                                  ? meal.recipeNameEn
                                  : meal.recipeName}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {Math.round(meal.calories)} kcal ·{" "}
                                {meal.portions}×
                              </span>
                            </button>
                            {!meal.isConsumed && !meal.isManual && (
                              <button
                                type="button"
                                disabled={swappingId === meal.id}
                                onClick={() => void swap(meal)}
                                className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500/20 disabled:opacity-50"
                                aria-label={t("Trocar receita")}
                                title={t("Trocar receita")}
                              >
                                <RefreshCw
                                  size={13}
                                  className={
                                    swappingId === meal.id ? "animate-spin" : ""
                                  }
                                />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="py-1 text-center text-[10px] text-stone-600">
                          {t("Largar aqui")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => onOpenDay(day)}
                className="mt-3 text-xs font-bold text-leaf-700"
              >
                {t("Ver dia")}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Summary({
  value,
  label,
  unit,
}: {
  value: number;
  label: string;
  unit: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold">
        {value}
        <span className="ml-1 text-xs font-semibold text-stone-400">
          {unit}
        </span>
      </p>
    </div>
  );
}
