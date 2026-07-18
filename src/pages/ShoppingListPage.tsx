import { Check, Minus, Plus, Share2, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { recipeName } from "../lib/recipe-language";
import {
  getShoppingEntryIds,
  getShoppingRecipePortions,
  getShoppingRecipes,
  saveShoppingEntryIds,
  saveShoppingRecipePortions,
  saveShoppingRecipes,
} from "../lib/shopping-list";
import { useMeals } from "../store/MealContext";
import NumberInput from "../components/NumberInput";

const normalise = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
type MeasuredIngredient = {
  key: string;
  name: string;
  amount: number;
  unit: string;
};
type IngredientCategory =
  | "Fruta e legumes"
  | "Laticínios e ovos"
  | "Carne, peixe e alternativas"
  | "Cereais e padaria"
  | "Despensa"
  | "Outros";

function ingredientCategory(name: string): IngredientCategory {
  const value = normalise(name);
  if (
    /(maçã|maca|banana|pêra|pera|morango|fruta|apple|banana|pear|strawberr|tomate|alface|cenoura|cebola|alho|espinafre|brócolo|brocolo|courgette|pepino|pimento|batata|abacate|vegetable|lettuce|carrot|onion|garlic|spinach|broccoli|zucchini|cucumber|pepper|potato|avocado)/.test(
      value,
    )
  )
    return "Fruta e legumes";
  if (/(iogurte|yogurt|leite|milk|queijo|cheese|ovo|egg)/.test(value))
    return "Laticínios e ovos";
  if (
    /(frango|peru|carne|atum|salmão|salmao|peixe|camarão|camarao|tofu|chicken|turkey|tuna|salmon|fish|prawn|shrimp|beef|pork)/.test(
      value,
    )
  )
    return "Carne, peixe e alternativas";
  if (
    /(aveia|oat|pão|pao|bread|arroz|rice|massa|pasta|farinha|flour|tortilha|tortilla|wrap)/.test(
      value,
    )
  )
    return "Cereais e padaria";
  if (
    /(azeite|oil|vinagre|vinegar|sal|salt|pimenta|pepper|cacau|cocoa|proteína|proteina|protein|adoçante|adocante|sweetener|fermento|yeast|baking|chocolate|mel|honey|manteiga|butter|canela|cinnamon)/.test(
      value,
    )
  )
    return "Despensa";
  return "Outros";
}

function measuredIngredient(value: string): MeasuredIngredient | null {
  const match = value
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\s+(?:de\s+)?(.+)$/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  const inputUnit = match[2].toLocaleLowerCase();
  const unit = inputUnit === "kg" ? "g" : inputUnit === "l" ? "ml" : inputUnit;
  const baseAmount =
    amount * (inputUnit === "kg" || inputUnit === "l" ? 1000 : 1);
  const name = normalise(match[3]);
  return { key: `${unit}:${name}`, name, amount: baseAmount, unit };
}

export default function ShoppingListPage() {
  const { entries, recipes, profile } = useMeals();
  const { t, i18n } = useTranslation();
  const storageKey = `meal-tracker-shopping-checked-${profile.userId}`;
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>(() =>
    getShoppingEntryIds(profile.userId),
  );
  const [selectedRecipes, setSelectedRecipes] = useState(() =>
    getShoppingRecipes(profile.userId),
  );
  const [portionOverrides, setPortionOverrides] = useState(() =>
    getShoppingRecipePortions(profile.userId),
  );
  const [view, setView] = useState<"ingredients" | "recipes">("ingredients");
  const planned = useMemo(
    () => entries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [entries, selectedEntryIds],
  );
  const plannedRecipes = useMemo(() => {
    const items = new Map<
      string,
      {
        recipe: (typeof recipes)[number];
        portions: number;
        dates: Set<string>;
        addedDirectly: boolean;
      }
    >();
    planned.forEach((entry) => {
      const recipe = recipes.find((item) => item.id === entry.recipeId);
      if (!recipe) return;
      const item = items.get(recipe.id) ?? {
        recipe,
        portions: 0,
        dates: new Set<string>(),
        addedDirectly: false,
      };
      item.portions += entry.portions;
      item.dates.add(entry.date);
      items.set(recipe.id, item);
    });
    selectedRecipes.forEach((selection) => {
      const recipe = recipes.find((item) => item.id === selection.recipeId);
      if (!recipe) return;
      const item = items.get(recipe.id) ?? {
        recipe,
        portions: 0,
        dates: new Set<string>(),
        addedDirectly: false,
      };
      item.portions += selection.portions;
      item.addedDirectly = true;
      items.set(recipe.id, item);
    });
    return [...items.values()]
      .map((item) => ({
        ...item,
        portions: portionOverrides[item.recipe.id] ?? item.portions,
      }))
      .sort((a, b) =>
        recipeName(a.recipe, i18n.language).localeCompare(
          recipeName(b.recipe, i18n.language),
          i18n.language,
        ),
      );
  }, [planned, selectedRecipes, portionOverrides, recipes, i18n.language]);
  const ingredients = useMemo(() => {
    const items = new Map<
      string,
      {
        key: string;
        name: string;
        amount: number | null;
        unit: string | null;
        sources: Map<string, { name: string; portions: number }>;
      }
    >();
    plannedRecipes.forEach(({ recipe, portions }) => {
      recipe.ingredients.forEach((ingredient, index) => {
        if (recipe.ingredientOptional[index]) return;
        const legacyMeasured = measuredIngredient(ingredient);
        const inputQuantity = recipe.ingredientQuantities[index];
        const inputUnit = recipe.ingredientUnits[index]?.trim();
        const structured =
          inputQuantity !== null && inputQuantity !== undefined && inputUnit
            ? (measuredIngredient(
                `${inputQuantity}${inputUnit} ${ingredient}`,
              ) ?? {
                key: `${normalise(inputUnit)}:${normalise(ingredient)}`,
                name: normalise(ingredient),
                amount: inputQuantity,
                unit: inputUnit,
              })
            : null;
        const measured = structured ?? legacyMeasured;
        const translatedIngredient =
          i18n.language.startsWith("en") && recipe.ingredientsEn[index]?.trim()
            ? recipe.ingredientsEn[index].trim()
            : ingredient;
        const translatedMeasured =
          structured &&
          inputQuantity !== null &&
          inputQuantity !== undefined &&
          inputUnit
            ? measuredIngredient(
                `${inputQuantity}${inputUnit} ${translatedIngredient}`,
              )
            : measuredIngredient(translatedIngredient);
        const key = measured?.key ?? normalise(ingredient);
        if (!key) return;
        const name = measured
          ? (translatedMeasured?.name ?? measured.name)
          : translatedIngredient;
        const scaledAmount = measured
          ? measured.amount * (portions / Math.max(recipe.servings, 1))
          : null;
        const item = items.get(key) ?? {
          key,
          name,
          amount: scaledAmount,
          unit: measured?.unit ?? null,
          sources: new Map(),
        };
        if (scaledAmount !== null && item.amount !== null)
          item.amount += items.has(key) ? scaledAmount : 0;
        const source = item.sources.get(recipe.id) ?? {
          name: recipeName(recipe, i18n.language),
          portions: 0,
        };
        source.portions += portions;
        item.sources.set(recipe.id, source);
        items.set(key, item);
      });
    });
    return [...items.values()].sort((a, b) =>
      a.name.localeCompare(b.name, i18n.language),
    );
  }, [plannedRecipes, i18n.language]);
  const groupedIngredients = useMemo(() => {
    const categories: IngredientCategory[] = [
      "Fruta e legumes",
      "Laticínios e ovos",
      "Carne, peixe e alternativas",
      "Cereais e padaria",
      "Despensa",
      "Outros",
    ];
    return categories
      .map((category) => ({
        category,
        items: ingredients
          .filter((item) => ingredientCategory(item.name) === category)
          .sort((a, b) => {
            const checkedDifference =
              Number(checked.includes(a.key)) - Number(checked.includes(b.key));
            return (
              checkedDifference || a.name.localeCompare(b.name, i18n.language)
            );
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [ingredients, checked, i18n.language]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);
  const toggle = (key: string) =>
    setChecked((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  const ingredientLabel = (item: {
    name: string;
    amount: number | null;
    unit: string | null;
  }) => {
    if (item.amount === null || !item.unit) return item.name;
    const useLargeUnit =
      (item.unit === "g" || item.unit === "ml") && item.amount >= 1000;
    const amount = useLargeUnit ? item.amount / 1000 : item.amount;
    const unit =
      item.unit === "g"
        ? useLargeUnit
          ? "kg"
          : "g"
        : item.unit === "ml"
          ? useLargeUnit
            ? "L"
            : "ml"
          : item.unit;
    const value = new Intl.NumberFormat(
      i18n.language.startsWith("en") ? "en-GB" : "pt-PT",
      { maximumFractionDigits: 2 },
    ).format(amount);
    return i18n.language.startsWith("en")
      ? `${value} ${unit} ${item.name}`
      : `${value} ${unit} de ${item.name}`;
  };
  const recipeIngredientLabel = (
    ingredient: string,
    translatedIngredient: string,
    portions: number,
    servings: number,
    quantity: number | null,
    unit: string,
  ) => {
    const measured =
      quantity !== null && unit
        ? (measuredIngredient(`${quantity}${unit} ${ingredient}`) ?? {
            key: `${normalise(unit)}:${normalise(ingredient)}`,
            name: normalise(ingredient),
            amount: quantity,
            unit,
          })
        : measuredIngredient(ingredient);
    if (!measured) return translatedIngredient;
    const translated =
      quantity !== null && unit
        ? measuredIngredient(`${quantity}${unit} ${translatedIngredient}`)
        : measuredIngredient(translatedIngredient);
    return ingredientLabel({
      name: translated?.name ?? measured.name,
      amount: measured.amount * (portions / Math.max(servings, 1)),
      unit: measured.unit,
    });
  };
  const locale = i18n.language.startsWith("en") ? "en-GB" : "pt-PT";
  const clearList = () => {
    setSelectedEntryIds([]);
    saveShoppingEntryIds(profile.userId, []);
    setSelectedRecipes([]);
    saveShoppingRecipes(profile.userId, []);
    setPortionOverrides({});
    saveShoppingRecipePortions(profile.userId, {});
    setChecked([]);
  };
  const updatePortions = (recipeId: string, portions: number) => {
    if (!Number.isFinite(portions) || portions <= 0) return;
    setPortionOverrides((current) => {
      const updated = { ...current, [recipeId]: portions };
      saveShoppingRecipePortions(profile.userId, updated);
      return updated;
    });
  };
  const removeRecipe = (recipeId: string) => {
    const entryIds = selectedEntryIds.filter(
      (id) => entries.find((entry) => entry.id === id)?.recipeId !== recipeId,
    );
    const directRecipes = selectedRecipes.filter(
      (item) => item.recipeId !== recipeId,
    );
    setSelectedEntryIds(entryIds);
    saveShoppingEntryIds(profile.userId, entryIds);
    setSelectedRecipes(directRecipes);
    saveShoppingRecipes(profile.userId, directRecipes);
    setPortionOverrides((current) => {
      const remaining = { ...current };
      delete remaining[recipeId];
      saveShoppingRecipePortions(profile.userId, remaining);
      return remaining;
    });
  };
  const shareText = () =>
    groupedIngredients
      .flatMap((group) => [
        t(group.category),
        ...group.items.map((item) => `• ${ingredientLabel(item)}`),
        "",
      ])
      .join("\n")
      .trim();
  const shareList = async () => {
    const text = shareText();
    if (navigator.share)
      await navigator.share({ title: t("Lista de compras"), text });
    else await navigator.clipboard.writeText(text);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <p className="font-semibold text-leaf-600">{t("Planeamento")}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
          {t("Lista de compras")}
        </h1>
        <p className="mt-2 text-stone-500">
          {t(
            "Adiciona as refeições que queres comprar a partir da vista semanal do diário.",
          )}
        </p>
      </div>
      <section className="card mt-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf-600/15 text-leaf-700">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="font-bold">
                {t("{{count}} refeição(ões) adicionada(s)", {
                  count: planned.length + selectedRecipes.length,
                })}
              </p>
              <p className="text-sm text-stone-400">
                {view === "ingredients"
                  ? t("{{count}} ingrediente(s) na lista", {
                      count: ingredients.length,
                    })
                  : t("{{count}} receita(s) planeada(s)", {
                      count: plannedRecipes.length,
                    })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {ingredients.length > 0 && (
              <button
                onClick={() => shareList().catch(() => undefined)}
                className="inline-flex items-center gap-2 text-sm font-bold text-leaf-700 hover:underline"
              >
                <Share2 size={16} />
                {t("Partilhar")}
              </button>
            )}
            {view === "ingredients" && checked.length > 0 && (
              <button
                onClick={() => setChecked([])}
                className="text-sm font-bold text-leaf-700 hover:underline"
              >
                {t("Limpar itens assinalados")}
              </button>
            )}
            {(planned.length > 0 || selectedRecipes.length > 0) && (
              <button
                onClick={clearList}
                className="text-sm font-bold text-rose-300 hover:underline"
              >
                {t("Limpar lista")}
              </button>
            )}
          </div>
        </div>
        <div className="border-b border-white/10 p-4">
          <div className="flex rounded-2xl bg-white/5 p-1 sm:w-fit">
            <button
              onClick={() => setView("ingredients")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold sm:flex-none ${view === "ingredients" ? "bg-leaf-600 text-white" : "text-stone-400 hover:text-white"}`}
            >
              {t("Ingredientes")}
            </button>
            <button
              onClick={() => setView("recipes")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold sm:flex-none ${view === "recipes" ? "bg-leaf-600 text-white" : "text-stone-400 hover:text-white"}`}
            >
              {t("Por receita")}
            </button>
          </div>
        </div>
        {ingredients.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingCart className="mx-auto text-leaf-500" size={40} />
            <h2 className="mt-4 text-xl font-bold">
              {t("A lista de compras está vazia")}
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              {t(
                "Abre a vista semanal do diário e adiciona as refeições futuras que queres comprar.",
              )}
            </p>
            <Link
              to="/diario"
              className="mt-6 inline-flex rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white"
            >
              {t("Ver diário")}
            </Link>
          </div>
        ) : view === "ingredients" ? (
          <>
            <div>
              {groupedIngredients.map((group) => (
                <section
                  key={group.category}
                  className="border-b border-white/10 last:border-0"
                >
                  <h2 className="bg-white/[0.03] px-5 py-3 text-sm font-extrabold text-leaf-700">
                    {t(group.category)}
                  </h2>
                  <div className="divide-y divide-white/10">
                    {group.items.map((item) => {
                      const done = checked.includes(item.key);
                      const label = ingredientLabel(item);
                      return (
                        <label
                          key={item.key}
                          className="flex cursor-pointer gap-4 p-5 hover:bg-white/[0.03]"
                        >
                          <button
                            type="button"
                            onClick={() => toggle(item.key)}
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${done ? "border-leaf-600 bg-leaf-600 text-white" : "border-white/20 bg-white/5 text-transparent"}`}
                            aria-label={t("Marcar ingrediente {{name}}", {
                              name: label,
                            })}
                          >
                            <Check size={16} />
                          </button>
                          <span className="min-w-0">
                            <span
                              className={`block font-semibold ${done ? "text-stone-500 line-through" : ""}`}
                            >
                              {label}
                            </span>
                            <span className="mt-1 block text-xs text-stone-400">
                              {[...item.sources.values()]
                                .map(
                                  (source) =>
                                    `${source.name} · ${t("{{count}} porção(ões)", { count: source.portions })}`,
                                )
                                .join(" · ")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <p className="border-t border-white/10 bg-white/[0.03] p-5 text-xs leading-relaxed text-stone-400">
              {t(
                "Ingredientes com g, kg, ml ou L são somados automaticamente quando o nome é igual.",
              )}
            </p>
          </>
        ) : (
          <div className="space-y-4 p-5">
            {plannedRecipes.map(
              ({ recipe, portions, dates, addedDirectly }) => (
                <article
                  key={recipe.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex gap-4 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-leaf-50">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipeName(recipe, i18n.language)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingCart className="m-6 text-leaf-500" size={28} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold">
                        {recipeName(recipe, i18n.language)}
                      </h2>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updatePortions(
                              recipe.id,
                              Math.max(0.5, portions - 0.5),
                            )
                          }
                          className="shrink-0 rounded-lg border border-white/10 p-1 text-stone-300 hover:bg-white/5"
                          aria-label={t("Reduzir porções")}
                        >
                          <Minus size={15} />
                        </button>
                        <NumberInput
                          className="input h-8 w-[4.5rem] shrink-0 bg-white/10 px-2 text-center text-sm font-extrabold !text-white"
                          min="0.5"
                          step="0.5"
                          value={portions}
                          onValueChange={(value) =>
                            updatePortions(recipe.id, value)
                          }
                          aria-label={t("Porções para a lista")}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updatePortions(recipe.id, portions + 0.5)
                          }
                          className="shrink-0 rounded-lg border border-white/10 p-1 text-stone-300 hover:bg-white/5"
                          aria-label={t("Aumentar porções")}
                        >
                          <Plus size={15} />
                        </button>
                        <span className="text-sm text-stone-400">
                          {t("porções na lista")}
                        </span>
                      </div>
                      {dates.size > 0 && (
                        <p className="mt-2 text-xs text-stone-500">
                          {[...dates]
                            .sort()
                            .map((date) =>
                              new Date(`${date}T12:00:00`).toLocaleDateString(
                                locale,
                                { day: "numeric", month: "short" },
                              ),
                            )
                            .join(" · ")}
                        </p>
                      )}
                      {addedDirectly && (
                        <p className="mt-1 text-xs text-stone-500">
                          {t("Adicionada diretamente")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRecipe(recipe.id)}
                      className="self-start rounded-xl border border-rose-400/25 p-2 text-rose-300 hover:bg-rose-500/10"
                      aria-label={t("Remover receita da lista")}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <ul className="border-t border-white/10 p-4 text-sm text-stone-300">
                    {recipe.ingredients.map((ingredient, index) =>
                      recipe.ingredientOptional[index] ? null : (
                        <li
                          key={`${ingredient}-${index}`}
                          className="flex gap-2 py-1.5"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-500" />
                          {recipeIngredientLabel(
                            ingredient,
                            i18n.language.startsWith("en") &&
                              recipe.ingredientsEn[index]?.trim()
                              ? recipe.ingredientsEn[index].trim()
                              : ingredient,
                            portions,
                            recipe.servings,
                            recipe.ingredientQuantities[index] ?? null,
                            recipe.ingredientUnits[index] ?? "",
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
