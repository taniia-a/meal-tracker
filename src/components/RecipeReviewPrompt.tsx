import { AlertCircle, Star, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../types';
import { useMeals } from '../store/MealContext';
import { recipeName } from '../lib/recipe-language';

export default function RecipeReviewPrompt({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { saveRecipeReview } = useMeals();
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating) { setError(t('Escolhe uma avaliação entre 1 e 5 estrelas.')); return; }
    setSaving(true); setError('');
    try { await saveRecipeReview(recipe.id, rating, comment); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('Não foi possível guardar a avaliação.')); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/50 p-5 backdrop-blur-sm">
    <form onSubmit={submit} className="card w-full max-w-md p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-leaf-600">{t('Avaliações')}</p><h2 className="mt-1 text-xl font-bold">{t('Avalia esta receita')}</h2><p className="mt-2 text-sm text-stone-400">{recipeName(recipe, i18n.language)}</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-stone-400 hover:bg-white/5" aria-label={t('Fechar')}><X size={20} /></button></div>
      <div className="mt-5 flex gap-2" aria-label={t('Avalia esta receita')}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} className="rounded-xl p-2 text-amber-300 hover:bg-amber-400/10" aria-label={t('{{count}} estrelas', { count: value })}><Star size={28} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div>
      <label className="mt-4 block text-sm font-semibold">{t('Comentário (opcional)')}<textarea value={comment} onChange={(event) => setComment(event.target.value)} className="input mt-2 min-h-28 resize-y" maxLength={1000} placeholder={t('Partilha a tua opinião sobre esta receita...')} /></label>
      {error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm font-semibold text-rose-300"><AlertCircle size={17} />{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-stone-300 hover:bg-white/5">{t('Avaliar mais tarde')}</button><button disabled={saving} className="rounded-xl bg-leaf-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? t('A guardar...') : t('Guardar avaliação')}</button></div>
    </form>
  </div>;
}
