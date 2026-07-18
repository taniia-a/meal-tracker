import { upload } from "@vercel/blob/client";
import { ArrowLeft, ImagePlus, Minus, Plus, X } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { authClient, getAuthToken } from "../lib/auth";
import { useMeals } from "../store/MealContext";
import { RecipeInput } from "../types";
import { useTranslation } from "react-i18next";
import NumberInput from "../components/NumberInput";

const recipeCategories = ["Pequeno Almoço", "Almoço/Jantar", "Snacks", "Sobremesas"] as const;
const recipeTastes = ["Doce", "Salgada"] as const;
const emptyRecipe: RecipeInput = {
  name: "",
  nameEn: "",
  category: "Almoço/Jantar",
  taste: "Salgada",
  prepMinutes: 20,
  servings: 1,
  imageUrl: null,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  ingredients: [""],
  ingredientsEn: [""],
  ingredientQuantities: [null],
  ingredientUnits: ["g"],
  ingredientOptional: [false],
  instructions: "",
  instructionsEn: "",
  notes: "",
  notesEn: "",
  isPublic: false,
};
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const units = ["g", "kg", "ml", "L", "unidade", "q.b."];

export default function RecipeEditorPage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { recipes, profile, saveRecipe } = useMeals();
  const existing = recipeId
    ? recipes.find((recipe) => recipe.id === recipeId)
    : undefined;
  const [recipe, setRecipe] = useState<RecipeInput>(() =>
    existing ? { ...existing } : emptyRecipe,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existing?.imageUrl ?? null,
  );

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  if (recipeId && (!existing || existing.ownerId !== profile.userId))
    return <Navigate to="/receitas" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let imageUrl = recipe.imageUrl;
      if (imageFile) {
        if (!authClient)
          throw new Error("A autenticação não está configurada.");
        const token = await getAuthToken();
        if (!token)
          throw new Error("A tua sessão expirou. Inicia sessão novamente.");
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const blob = await upload(
          `recipe-images/${crypto.randomUUID()}-${safeName}`,
          imageFile,
          {
            access: "public",
            handleUploadUrl: "/api/recipe-image-upload",
            clientPayload: JSON.stringify({ token }),
          },
        );
        imageUrl = blob.url;
      }
      await saveRecipe({ ...recipe, imageUrl }, recipeId);
      navigate("/receitas");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível guardar a receita.",
      );
      setSaving(false);
    }
  };
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!allowedImageTypes.includes(file.type)) {
      setError("Escolhe uma imagem JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > maxImageSize) {
      setError("A imagem não pode ter mais de 5 MB.");
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };
  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setRecipe({ ...recipe, imageUrl: null });
  };
  const updateIngredient = (index: number, value: string) =>
    setRecipe({
      ...recipe,
      ingredients: recipe.ingredients.map((item, position) =>
        position === index ? value : item,
      ),
    });
  const updateIngredientEn = (index: number, value: string) =>
    setRecipe({
      ...recipe,
      ingredientsEn: recipe.ingredientsEn.map((item, position) =>
        position === index ? value : item,
      ),
    });
  const updateIngredientQuantity = (index: number, value: string) =>
    setRecipe({
      ...recipe,
      ingredientQuantities: recipe.ingredientQuantities.map((item, position) =>
        position === index ? (value === "" ? null : Number(value)) : item,
      ),
    });
  const updateIngredientUnit = (index: number, value: string) =>
    setRecipe({
      ...recipe,
      ingredientUnits: recipe.ingredientUnits.map((item, position) =>
        position === index ? value : item,
      ),
    });
  const updateIngredientOptional = (index: number, value: boolean) =>
    setRecipe({
      ...recipe,
      ingredientOptional: recipe.ingredientOptional.map((item, position) =>
        position === index ? value : item,
      ),
    });

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/receitas"
        className="inline-flex items-center gap-2 text-sm font-bold text-leaf-700"
      >
        <ArrowLeft size={17} /> {t("Voltar às receitas")}
      </Link>
      <div className="mt-5">
        <p className="font-semibold text-leaf-700">
          {t(existing ? "Editar receita" : "Nova receita")}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">
          {existing ? existing.name : t("Cria uma receita")}
        </h1>
      </div>
      <form onSubmit={submit} className="card mt-7 space-y-7 p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input
              className="input mt-2"
              required
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
            />
          </Field>
          <Field label="Categoria">
            <select
              className="input mt-2"
              required
              value={recipe.category}
              onChange={(e) =>
                setRecipe({ ...recipe, category: e.target.value })
              }
            >
              {recipeCategories.map((category) => (
                <option key={category} value={category}>
                  {t(category)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              className="input mt-2"
              required
              value={recipe.taste}
              onChange={(e) =>
                setRecipe({ ...recipe, taste: e.target.value as RecipeInput["taste"] })
              }
            >
              {recipeTastes.map((taste) => (
                <option key={taste} value={taste}>
                  {t(taste)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tempo de preparação (min)">
            <NumberInput
              className="input mt-2"
              min="0"
              required
              value={recipe.prepMinutes}
              onValueChange={(value) =>
                setRecipe({ ...recipe, prepMinutes: value })
              }
            />
          </Field>
          <Field label="Número de porções">
            <NumberInput
              className="input mt-2"
              min="1"
              step="1"
              required
              value={recipe.servings}
              onValueChange={(value) =>
                setRecipe({ ...recipe, servings: value })
              }
            />
          </Field>
        </div>
        <Field label="Nome em inglês (opcional)">
          <input
            className="input mt-2"
            value={recipe.nameEn}
            onChange={(e) => setRecipe({ ...recipe, nameEn: e.target.value })}
          />
        </Field>
        <fieldset>
          <legend className="font-bold">
            {t("Imagem da receita")}{" "}
            <span className="font-normal text-stone-400">
              {t("(opcional)")}
            </span>
          </legend>
          <div className="mt-3 overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/5">
            {previewUrl ? (
              <div className="relative h-64">
                <img
                  src={previewUrl}
                  alt={t("Pré-visualização da receita")}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 rounded-xl bg-black/60 p-2 text-white backdrop-blur hover:bg-rose-500"
                  aria-label={t("Remover imagem")}
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center px-5 py-12 text-center hover:bg-white/5">
                <ImagePlus className="text-leaf-500" size={36} />
                <span className="mt-3 font-bold">
                  {t("Escolher uma imagem")}
                </span>
                <span className="mt-1 text-xs text-stone-400">
                  {t("JPEG, PNG ou WebP · máximo 5 MB")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectImage}
                  className="sr-only"
                />
              </label>
            )}
          </div>
          {previewUrl && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-leaf-700">
              <ImagePlus size={17} /> {t("Substituir imagem")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectImage}
                className="sr-only"
              />
            </label>
          )}
        </fieldset>
        <fieldset>
          <legend className="font-bold">{t("Valores por porção")}</legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Macro
              label="Calorias"
              unit="kcal"
              value={recipe.calories}
              onChange={(value) => setRecipe({ ...recipe, calories: value })}
            />
            <Macro
              label="Proteína"
              unit="g"
              value={recipe.protein}
              onChange={(value) => setRecipe({ ...recipe, protein: value })}
            />
            <Macro
              label="Hidratos"
              unit="g"
              value={recipe.carbs}
              onChange={(value) => setRecipe({ ...recipe, carbs: value })}
            />
            <Macro
              label="Gordura"
              unit="g"
              value={recipe.fat}
              onChange={(value) => setRecipe({ ...recipe, fat: value })}
            />
          </div>
        </fieldset>
        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="font-bold">{t("Ingredientes")}</legend>
            <button
              type="button"
              onClick={() =>
                setRecipe({
                  ...recipe,
                  ingredients: [...recipe.ingredients, ""],
                  ingredientsEn: [...recipe.ingredientsEn, ""],
                  ingredientQuantities: [...recipe.ingredientQuantities, null],
                  ingredientUnits: [...recipe.ingredientUnits, "g"],
                  ingredientOptional: [...recipe.ingredientOptional, false],
                })
              }
              className="flex items-center gap-1 text-sm font-bold text-leaf-700"
            >
              <Plus size={16} /> {t("Adicionar")}
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <div className="hidden gap-2 px-1 text-xs font-bold uppercase tracking-wide text-stone-400 sm:grid sm:grid-cols-[6rem_10rem_1fr_1fr_5rem_auto]">
              <span>{t("Quantidade")}</span>
              <span>{t("Unidade")}</span>
              <span>{t("Ingrediente (PT)")}</span>
              <span>{t("Ingrediente (EN)")}</span>
              <span>{t("Opcional")}</span>
            </div>
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
                <div className="grid gap-2 sm:grid-cols-[6rem_10rem_1fr_1fr_5rem]">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.1"
                    required={(recipe.ingredientUnits[index] || "g") !== "q.b."}
                    value={recipe.ingredientQuantities[index] ?? ""}
                    placeholder={t("Quantidade")}
                    onChange={(e) =>
                      updateIngredientQuantity(index, e.target.value)
                    }
                  />
                  <select
                    className="input"
                    value={recipe.ingredientUnits[index] || "g"}
                    onChange={(e) =>
                      updateIngredientUnit(index, e.target.value)
                    }
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {t(unit)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    required
                    value={ingredient}
                    placeholder={t("Ingrediente (PT)")}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                  />
                  <input
                    className="input"
                    value={recipe.ingredientsEn[index] ?? ""}
                    placeholder={t("Ingrediente (EN)")}
                    onChange={(e) => updateIngredientEn(index, e.target.value)}
                  />
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={recipe.ingredientOptional[index] ?? false}
                      onChange={(e) =>
                        updateIngredientOptional(index, e.target.checked)
                      }
                      aria-label={t("Opcional")}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={recipe.ingredients.length === 1}
                  onClick={() =>
                    setRecipe({
                      ...recipe,
                      ingredients: recipe.ingredients.filter(
                        (_, position) => position !== index,
                      ),
                      ingredientsEn: recipe.ingredientsEn.filter(
                        (_, position) => position !== index,
                      ),
                      ingredientQuantities: recipe.ingredientQuantities.filter(
                        (_, position) => position !== index,
                      ),
                      ingredientUnits: recipe.ingredientUnits.filter(
                        (_, position) => position !== index,
                      ),
                      ingredientOptional: recipe.ingredientOptional.filter(
                        (_, position) => position !== index,
                      ),
                    })
                  }
                  className="rounded-xl border border-white/10 p-3 text-stone-400 hover:text-rose-400 disabled:opacity-30"
                >
                  <Minus size={18} />
                </button>
              </div>
            ))}
          </div>
        </fieldset>
        <Field label="Preparação">
          <textarea
            className="input mt-2 min-h-36 resize-y"
            placeholder={t("Descreve os passos de preparação...")}
            value={recipe.instructions}
            onChange={(e) =>
              setRecipe({ ...recipe, instructions: e.target.value })
            }
          />
        </Field>
        <Field label="Preparação em inglês (opcional)">
          <textarea
            className="input mt-2 min-h-36 resize-y"
            placeholder="Describe the preparation steps..."
            value={recipe.instructionsEn}
            onChange={(e) =>
              setRecipe({ ...recipe, instructionsEn: e.target.value })
            }
          />
        </Field>
        <Field label="Observações (opcional)">
          <textarea
            className="input mt-2 min-h-24 resize-y"
            placeholder={t(
              "Ex.: substituições, sugestões ou informação adicional...",
            )}
            value={recipe.notes}
            onChange={(e) => setRecipe({ ...recipe, notes: e.target.value })}
          />
        </Field>
        <Field label="Observações em inglês (opcional)">
          <textarea
            className="input mt-2 min-h-24 resize-y"
            placeholder="E.g. substitutions, serving suggestions or extra information..."
            value={recipe.notesEn}
            onChange={(e) => setRecipe({ ...recipe, notesEn: e.target.value })}
          />
        </Field>
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input
            className="mt-1"
            type="checkbox"
            checked={recipe.isPublic}
            onChange={(e) =>
              setRecipe({ ...recipe, isPublic: e.target.checked })
            }
          />
          <span>
            <span className="block font-bold">
              {t("Tornar receita pública")}
            </span>
            <span className="text-xs text-stone-400">
              {t(
                "Outros utilizadores poderão encontrá-la, mas apenas tu poderás alterá-la.",
              )}
            </span>
          </span>
        </label>
        {error && (
          <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </p>
        )}
        <button
          disabled={saving}
          className="w-full rounded-2xl bg-leaf-600 px-5 py-3.5 font-bold text-white disabled:opacity-60"
        >
          {t(
            saving
              ? "A guardar..."
              : existing
                ? "Guardar alterações"
                : "Criar receita",
          )}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <label className="block text-sm font-semibold">
      {t(label)}
      {children}
    </label>
  );
}
function Macro({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="text-xs font-semibold text-stone-400">
      {t(label)}
      <span className="relative mt-1 block">
        <NumberInput
          className="input pr-12"
          min="0"
          step="0.1"
          required
          value={value}
          onValueChange={onChange}
        />
        <span className="absolute right-3 top-3 text-[10px]">{unit}</span>
      </span>
    </label>
  );
}
