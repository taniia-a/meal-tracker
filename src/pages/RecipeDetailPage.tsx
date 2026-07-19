import {
  ArrowLeft,
  Clock,
  Pencil,
  Plus,
  Share2,
  ShoppingCart,
  Star,
  Trash2,
  Utensils,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AddMealModal from "../components/AddMealModal";
import { useMeals } from "../store/MealContext";
import { useTranslation } from "react-i18next";
import {
  recipeIngredients,
  recipeInstructions,
  recipeName,
} from "../lib/recipe-language";
import { addShoppingRecipe } from "../lib/shopping-list";

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const { recipes, isRecipesLoading, profile, deleteRecipe, recipeReviews, saveRecipeReview, deleteRecipeReview } = useMeals();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [shareMessage, setShareMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const recipe = recipes.find((item) => item.id === recipeId);

  if (isRecipesLoading)
    return (
      <div className="card p-10 text-center text-stone-400">
        {t("A carregar receita...")}
      </div>
    );
  if (!recipe) return <Navigate to="/receitas" replace />;

  const remove = async () => {
    if (
      !window.confirm(
        t("Apagar “{{name}}”?", { name: recipeName(recipe, i18n.language) }),
      )
    )
      return;
    setDeleting(true);
    setError("");
    try {
      await deleteRecipe(recipe.id);
      navigate("/receitas");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("Não foi possível apagar."),
      );
      setDeleting(false);
    }
  };
  const addToShoppingList = () => {
    try {
      addShoppingRecipe(profile.userId, recipe.id, recipe.servings);
      setShoppingMessage({
        type: "success",
        text: t("Receita adicionada à lista de compras."),
      });
    } catch {
      setShoppingMessage({
        type: "error",
        text: t("Não foi possível adicionar a receita à lista de compras."),
      });
    }
  };
  const shareRecipe = async () => {
    setShareMessage(null);
    try {
      const url = window.location.href;
      const title = recipeName(recipe, i18n.language);
      if (navigator.share) await navigator.share({ title, text: t('Vê esta receita no Meal Tracker.'), url });
      else await navigator.clipboard.writeText(url);
      setShareMessage({ type: 'success', text: t('Link copiado. Quem o receber terá de criar conta ou iniciar sessão para ver a receita.') });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setShareMessage({ type: 'error', text: t('Não foi possível partilhar a receita.') });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/receitas"
          className="inline-flex items-center gap-2 text-sm font-bold text-leaf-700"
        >
          <ArrowLeft size={17} /> {t("Voltar às receitas")}
        </Link>
        {recipe.ownerId === profile.userId && (
          <div className="flex items-center gap-2">
            <Link
              to={`/receitas/${recipe.id}/editar`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
            >
              <Pencil size={16} /> {t("Editar")}
            </Link>
            <button
              type="button"
              disabled={deleting}
              onClick={remove}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
            >
              <Trash2 size={16} /> {t(deleting ? "A apagar..." : "Apagar")}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300"
        >
          {error}
        </p>
      )}
      <article className="card mt-5 overflow-hidden">
        <div
          className={`flex h-64 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-96 ${recipe.imageColor}`}
        >
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipeName(recipe, i18n.language)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Utensils size={70} className="text-white/80" />
          )}
        </div>
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill bg-leaf-50 text-leaf-700">
              {t(recipe.category)}
            </span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${recipe.taste === "Doce" ? "bg-pink-500/10 text-pink-300" : "bg-sky-500/10 text-sky-300"}`}>
              {t(recipe.taste)}
            </span>
            <span className="flex items-center gap-1 text-sm text-stone-400">
              <Clock size={16} /> {recipe.prepMinutes} min
            </span>
            <span className="text-sm text-stone-400">
              {t("{{count}} porção(ões)", { count: recipe.servings })}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">
            {recipeName(recipe, i18n.language)}
          </h1>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Macro value={recipe.calories} label={t("Calorias")} unit="kcal" />
            <Macro value={recipe.protein} label={t("Proteína")} unit="g" />
            <Macro value={recipe.carbs} label={t("Hidratos")} unit="g" />
            <Macro value={recipe.fat} label={t("Gordura")} unit="g" />
          </div>
          <div className="mt-9 grid gap-9 md:grid-cols-2">
            <section>
              <h2 className="text-xl font-bold">{t("Ingredientes")}</h2>
              <ul className="mt-4 space-y-3">
                {recipeIngredients(recipe, i18n.language).map(
                  (ingredient, index) => (
                    <li
                      key={`${ingredient}-${index}`}
                      className="flex gap-3 text-stone-300"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-500" />
                      {ingredient}
                    </li>
                  ),
                )}
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-bold">{t("Preparação")}</h2>
              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-stone-300">
                {recipeInstructions(recipe, i18n.language) ||
                  t("Ainda não foram adicionadas instruções de preparação.")}
              </p>
              {(i18n.language.startsWith("en")
                ? recipe.notesEn || recipe.notes
                : recipe.notes) && (
                <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h2 className="font-bold">{t("Observações")}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                    {i18n.language.startsWith("en")
                      ? recipe.notesEn || recipe.notes
                      : recipe.notes}
                  </p>
                </div>
              )}
            </section>
          </div>
          <div className="mt-9">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setRegistering(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3.5 font-bold text-white sm:w-auto"
              >
                <Plus size={18} /> {t("Registar refeição")}
              </button>
              <button
                onClick={addToShoppingList}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3.5 font-bold hover:bg-white/5 sm:w-auto"
              >
                <ShoppingCart size={18} /> {t("Adicionar à lista de compras")}
              </button>
              {recipe.isPublic && <button
                onClick={() => void shareRecipe()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-400/35 px-5 py-3.5 font-bold text-purple-200 hover:bg-purple-500/10 sm:w-auto"
              >
                <Share2 size={18} /> {t("Partilhar receita")}
              </button>}
            </div>
            {shoppingMessage && (
              <p
                role={shoppingMessage.type === "error" ? "alert" : "status"}
                className={`mt-3 rounded-2xl p-4 text-sm font-semibold ${shoppingMessage.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}
              >
                {shoppingMessage.text}
              </p>
            )}
            {shareMessage && <p role={shareMessage.type === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-2xl p-4 text-sm font-semibold ${shareMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{shareMessage.text}</p>}
          </div>
          <RecipeReviews
            reviews={recipeReviews.filter((review) => review.recipeId === recipe.id)}
            userId={profile.userId}
            onSave={(rating, comment) => saveRecipeReview(recipe.id, rating, comment)}
            onDelete={deleteRecipeReview}
          />
        </div>
      </article>
      {registering && (
        <AddMealModal recipe={recipe} onClose={() => setRegistering(false)} />
      )}
    </div>
  );
}

function RecipeReviews({ reviews, userId, onSave, onDelete }: { reviews: ReturnType<typeof useMeals>["recipeReviews"]; userId: string; onSave: (rating: number, comment: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const { t, i18n } = useTranslation();
  const reviewsPerPage = 5;
  const ownReview = reviews.find((review) => review.userId === userId);
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [comment, setComment] = useState(ownReview?.comment ?? "");
  const [isEditing, setIsEditing] = useState(!ownReview);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const orderedReviews = [...reviews].sort((first, second) => {
    const firstIsOwn = first.userId === userId;
    const secondIsOwn = second.userId === userId;
    if (firstIsOwn !== secondIsOwn) return firstIsOwn ? -1 : 1;
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
  const average = orderedReviews.length ? orderedReviews.reduce((sum, review) => sum + review.rating, 0) / orderedReviews.length : 0;
  const pageCount = Math.max(1, Math.ceil(orderedReviews.length / reviewsPerPage));
  const currentPage = Math.min(page, pageCount);
  const visibleReviews = orderedReviews.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating) { setMessage({ type: "error", text: t("Escolhe uma avaliação entre 1 e 5 estrelas.") }); return; }
    setSaving(true); setMessage(null);
    try { await onSave(rating, comment); setIsEditing(false); setMessage({ type: "success", text: t("Avaliação guardada com sucesso.") }); }
    catch (reason) { setMessage({ type: "error", text: reason instanceof Error ? reason.message : t("Não foi possível guardar a avaliação.") }); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!ownReview || !window.confirm(t("Apagar a tua avaliação?"))) return;
    setSaving(true); setMessage(null);
    try { await onDelete(ownReview.id); setRating(0); setComment(""); setIsEditing(true); setMessage({ type: "success", text: t("Avaliação apagada.") }); }
    catch (reason) { setMessage({ type: "error", text: reason instanceof Error ? reason.message : t("Não foi possível apagar a avaliação.") }); }
    finally { setSaving(false); }
  };
  return <section className="mt-10 border-t border-white/10 pt-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Avaliações")}</h2><p className="mt-1 text-sm text-stone-400">{reviews.length ? t("{{average}} de 5 · {{count}} avaliação(ões)", { average: average.toFixed(1), count: reviews.length }) : t("Ainda não existem avaliações.")}</p></div>{reviews.length > 0 && <div className="flex items-center gap-1 text-amber-300"><Star size={19} fill="currentColor" /><strong>{average.toFixed(1)}</strong></div>}</div>
    {isEditing && <form onSubmit={save} className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"><p className="font-bold">{t(ownReview ? "Editar a tua avaliação" : "Avalia esta receita")}</p><div className="mt-3 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className="rounded-lg p-1 text-amber-300 transition hover:scale-110" aria-label={t("{{count}} estrelas", { count: value })}><Star size={27} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div><label className="mt-4 block text-sm font-semibold">{t("Comentário (opcional)")}<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} className="input mt-2 min-h-24 resize-y" placeholder={t("Partilha a tua opinião sobre esta receita...")} /></label><div className="mt-4 flex flex-wrap gap-3"><button disabled={saving || !rating} className="rounded-xl bg-leaf-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? t("A guardar...") : t("Guardar avaliação")}</button>{ownReview && <button type="button" disabled={saving} onClick={() => { setRating(ownReview.rating); setComment(ownReview.comment); setIsEditing(false); }} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold disabled:opacity-60">{t("Cancelar")}</button>}</div></form>}
    {message && <p role={message.type === "error" ? "alert" : "status"} className={`mt-4 text-sm font-semibold ${message.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>{message.text}</p>}
    <div className="mt-5 space-y-3">{reviews.length ? visibleReviews.map((review) => <article key={review.id} className="rounded-2xl border border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{review.userId === userId ? t("Tu") : t("Utilizador")}</p><p className="mt-1 flex items-center gap-1 text-sm text-amber-300"><Star size={15} fill="currentColor" /> {review.rating} / 5</p></div><div className="flex items-center gap-2"><time className="text-xs text-stone-400">{new Date(review.createdAt).toLocaleDateString(i18n.language.startsWith("en") ? "en-GB" : "pt-PT")}</time>{review.userId === userId && <><button type="button" onClick={() => { setRating(review.rating); setComment(review.comment); setIsEditing(true); }} className="rounded-lg p-2 text-stone-400 hover:bg-white/5 hover:text-white" aria-label={t("Editar a tua avaliação")}><Pencil size={16} /></button><button type="button" onClick={() => void remove()} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10" aria-label={t("Apagar avaliação")}><Trash2 size={16} /></button></>}</div></div>{review.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{review.comment}</p>}</article>) : <p className="rounded-2xl bg-white/5 p-4 text-sm text-stone-400">{t("Sê a primeira pessoa a avaliar esta receita.")}</p>}</div>
    {reviews.length > reviewsPerPage && <div className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40">{t("Anterior")}</button><p className="text-sm text-stone-400">{t("Página {{page}} de {{total}}", { page: currentPage, total: pageCount })}</p><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40">{t("Seguinte")}</button></div>}
  </section>;
}

function Macro({
  value,
  label,
  unit,
}: {
  value: number;
  label: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 text-center">
      <p className="text-xl font-extrabold">
        {value}
        <span className="ml-1 text-xs font-semibold text-stone-400">
          {unit}
        </span>
      </p>
      <p className="mt-1 text-xs uppercase text-stone-400">{label}</p>
    </div>
  );
}
