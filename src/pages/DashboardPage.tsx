import { ArrowRight, Droplets, Flame, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NutritionProgress, sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';
import { recipeName } from '../lib/recipe-language';
import { nutritionDay } from '../lib/nutrition-day';
import { pantryRecipeMatch } from '../lib/pantry';
import { useState } from 'react';

export default function DashboardPage() {
  const { entries, goals, recipes, profile, pantryItems, recipeReviews, waterConsumedMl, waterEntryDay, adjustWater } = useMeals();
  const { t, i18n } = useTranslation();
  const [waterError, setWaterError] = useState('');
  const [isUpdatingWater, setIsUpdatingWater] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState('100');
  const [isMealMenuOpen, setIsMealMenuOpen] = useState(false);
  const today = nutritionDay();
  const todayWaterMl = waterEntryDay === today ? waterConsumedMl : 0;
  const todayEntries = entries.filter((entry) => entry.date === today);
  const consumedTodayEntries = todayEntries.filter((entry) => entry.isConsumed);
  const total = sumMacros(consumedTodayEntries);
  const remaining = Math.max(goals.calories - total.calories, 0);
  const dinnerMissing = !consumedTodayEntries.some((entry) => entry.mealType === 'Jantar');
  const normaliseIngredient = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const dislikedIngredients = profile.dislikedIngredients.map(normaliseIngredient).filter(Boolean);
  const hasDislikedIngredient = (ingredients: string[]) => ingredients.some((ingredient) => dislikedIngredients.some((disliked) => normaliseIngredient(ingredient).includes(disliked) || disliked.includes(normaliseIngredient(ingredient))));
  const fourWeeksAgo = new Date(`${today}T12:00:00`); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentCutoff = `${fourWeeksAgo.getFullYear()}-${String(fourWeeksAgo.getMonth() + 1).padStart(2, '0')}-${String(fourWeeksAgo.getDate()).padStart(2, '0')}`;
  const recentlyConsumedRecipeIds = new Set(entries.filter((entry) => entry.isConsumed && entry.recipeId && entry.date >= recentCutoff && entry.date <= today).map((entry) => entry.recipeId));
  const userRatings = new Map(recipeReviews.filter((review) => review.userId === profile.userId).map((review) => [review.recipeId, review.rating]));
  const averageRatings = new Map(recipes.map((recipe) => {
    const ratings = recipeReviews.filter((review) => review.recipeId === recipe.id);
    return [recipe.id, ratings.length ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length : 0];
  }));
  const suggestions = dinnerMissing ? recipes.filter((recipe) => recipe.category === 'Almoço/Jantar' && !recentlyConsumedRecipeIds.has(recipe.id) && !hasDislikedIngredient([...recipe.ingredients, ...recipe.ingredientsEn])).map((recipe) => {
    const macroScore = Math.abs(Math.max(goals.protein - total.protein, 0) - recipe.protein) / Math.max(goals.protein, 1)
      + Math.abs(Math.max(goals.carbs - total.carbs, 0) - recipe.carbs) / Math.max(goals.carbs, 1)
      + Math.abs(Math.max(goals.fat - total.fat, 0) - recipe.fat) / Math.max(goals.fat, 1);
    const calorieScore = Math.abs(remaining - recipe.calories) / Math.max(goals.calories, 1);
    const ownRating = userRatings.get(recipe.id) ?? 0;
    const averageRating = averageRatings.get(recipe.id) ?? 0;
    const pantryMatch = pantryRecipeMatch(recipe, pantryItems);
    const reasons = [t('Compatível com os teus ingredientes a evitar.'), t('Não a consumiste nas últimas 4 semanas.')];
    if (goals.protein > total.protein && recipe.protein >= 20) reasons.push(t('Ajuda a atingir a proteína que te falta hoje.'));
    if (averageRating >= 4) reasons.push(t('Bem avaliada ({{rating}}/5).', { rating: averageRating.toFixed(1) }));
    if (pantryMatch.expiring.length) reasons.push(t('Usa {{count}} ingrediente(s) com validade próxima.', { count: pantryMatch.expiring.length }));
    else if (pantryMatch.matching.length) reasons.push(t('Usa ingredientes que tens em stock.'));
    return { recipe, score: macroScore + calorieScore - ownRating * 0.08 - pantryMatch.score, reasons };
  }).sort((a, b) => a.score - b.score).slice(0, 3) : [];
  const waterProgress = Math.min((todayWaterMl / profile.waterGoalMl) * 100, 100);
  const updateWater = async (amountMl: number) => {
    setIsUpdatingWater(true);
    setWaterError('');
    try {
      await adjustWater(amountMl);
      return true;
    } catch (error) {
      setWaterError(error instanceof Error ? error.message : t('Não foi possível atualizar a água.'));
      return false;
    } finally {
      setIsUpdatingWater(false);
    }
  };
  const addCustomWater = async () => {
    const amountMl = Number(customWaterMl);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      setWaterError(t('Introduz uma quantidade de água válida.'));
      return;
    }
    if (await updateWater(amountMl)) setCustomWaterMl('100');
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="font-semibold text-leaf-600">{t('O teu dia nutricional')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Olá! O que vamos comer?')}</h1><p className="mt-2 text-stone-500">{t('Acompanha as refeições e mantém os teus objetivos à vista.')}</p></div>
        <div className="relative"><button type="button" onClick={() => setIsMealMenuOpen((open) => !open)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white hover:bg-leaf-700 sm:w-auto"><Plus size={19} /> {t('Registar refeição')}</button>{isMealMenuOpen && <div className="absolute right-0 z-20 mt-2 w-full min-w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#17121d] p-2 shadow-xl sm:w-56"><Link to="/diario?pesquisar=1" onClick={() => setIsMealMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-white/5">{t('Pesquisar receitas')}</Link><Link to="/diario?manual=1" onClick={() => setIsMealMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-white/5">{t('Refeição manual')}</Link></div>}</div>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="card relative overflow-hidden bg-ink p-7 text-white">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-leaf-500/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-leaf-100"><Flame size={17} /> {t('Calorias restantes')}</div>
            <div className="mt-5 flex items-end gap-3"><span className="font-display text-6xl font-extrabold">{Math.round(remaining)}</span><span className="mb-2 text-stone-300">kcal</span></div>
            <p className="mt-3 text-sm text-stone-300">{t('Consumiste {{consumed}} das {{goal}} kcal planeadas.', { consumed: Math.round(total.calories), goal: goals.calories })}</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.min(total.calories / goals.calories * 100, 100)}%` }} /></div>
          </div>
        </div>
        <div className="card space-y-6 p-7">
          <h2 className="text-lg font-bold">{t('Macronutrientes')}</h2>
          <NutritionProgress label={t('Proteína')} value={total.protein} goal={goals.protein} unit="g" color="bg-sky-500" />
          <NutritionProgress label={t('Hidratos')} value={total.carbs} goal={goals.carbs} unit="g" color="bg-amber-400" />
          <NutritionProgress label={t('Gordura')} value={total.fat} goal={goals.fat} unit="g" color="bg-rose-400" />
        </div>
      </section>

      <section className="card mt-6 p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-400"><Droplets size={24} /></div><div><h2 className="text-xl font-bold">{t('Água')}</h2><p className="mt-1 text-sm text-stone-400">{t('{{consumed}} ml de {{goal}} ml', { consumed: todayWaterMl, goal: profile.waterGoalMl })}</p></div></div>
          <Link to="/diario" className="flex items-center gap-1 text-sm font-bold text-leaf-600">{t('Ver diário')} <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${waterProgress}%` }} /></div>
        <div className="mt-4 space-y-3 lg:flex lg:items-center lg:gap-6 lg:space-y-0">
          <div className="flex w-full shrink-0 gap-2 lg:w-auto"><button type="button" disabled={isUpdatingWater} onClick={() => void updateWater(250)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-60 lg:flex-none"><Plus size={17} /> 250 ml</button><button type="button" disabled={isUpdatingWater} onClick={() => void updateWater(500)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-60 lg:flex-none"><Plus size={17} /> 500 ml</button></div>
          <div className="flex flex-nowrap items-center gap-2 lg:min-w-0 lg:flex-1">
            <label className="shrink-0 text-sm font-semibold text-stone-300" htmlFor="custom-water">{t('Outro valor')}</label>
            <div className="relative w-20 shrink-0"><input id="custom-water" type="number" inputMode="numeric" min="1" max="5000" step="1" value={customWaterMl} onChange={(event) => setCustomWaterMl(event.target.value)} className="input h-10 w-full py-2 pr-8" /><span className="pointer-events-none absolute right-2.5 top-2.5 text-xs text-stone-400">ml</span></div>
            <button type="button" disabled={isUpdatingWater || !customWaterMl} onClick={() => void addCustomWater()} className="h-10 min-w-0 flex-1 whitespace-nowrap rounded-xl border border-sky-400/40 px-2 text-sm font-bold text-sky-300 transition hover:bg-sky-500/10 disabled:opacity-50">{t('Adicionar água')}</button>
          </div>
        </div>
        {waterError && <p role="alert" className="mt-3 text-sm font-semibold text-rose-400">{waterError}</p>}
      </section>

      <section className="card mt-6 p-7">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{t('Refeições de hoje')}</h2><p className="mt-1 text-sm text-stone-500">{todayEntries.length ? t('{{count}} registo(s)', { count: todayEntries.length }) : t('Ainda não registaste nenhuma refeição.')}</p></div><Link to="/diario" className="flex items-center gap-1 text-sm font-bold text-leaf-600">{t('Ver diário')} <ArrowRight size={16} /></Link></div>
        {todayEntries.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-400">{t('Pesquisa uma receita para começares o teu dia.')}</div> : <div className="mt-6 divide-y divide-stone-100">{todayEntries.slice(-4).reverse().map((entry) => <div key={entry.id} className="flex items-center justify-between py-4"><div><div className="flex flex-wrap items-center gap-2">{entry.recipeId ? <Link to={`/receitas/${entry.recipeId}`} className="font-bold hover:text-leaf-600 hover:underline">{i18n.language.startsWith('en') && entry.recipeNameEn ? entry.recipeNameEn : entry.recipeName}</Link> : <p className="font-bold">{i18n.language.startsWith('en') && entry.recipeNameEn ? entry.recipeNameEn : entry.recipeName}</p>}{!entry.isConsumed && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">{t('Planeada')}</span>}</div><p className="text-sm text-stone-400">{t(entry.mealType)} · {t('{{count}} porção(ões)', { count: entry.portions })}</p></div><span className="font-bold">{entry.calories} kcal</span></div>)}</div>}
      </section>
      {dinnerMissing && suggestions.length > 0 && <section className="card mt-6 p-7"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf-600/15 text-leaf-700"><Sparkles size={21} /></div><div><h2 className="text-xl font-bold">{t('Sugestões para o jantar')}</h2><p className="mt-1 text-sm text-stone-400">{t('Receitas escolhidas com base no que falta para os teus objetivos de hoje.')}</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-3">{suggestions.map(({ recipe, reasons }) => <Link key={recipe.id} to={`/receitas/${recipe.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-leaf-500/40 hover:bg-white/[0.06]"><p className="font-bold">{recipeName(recipe, i18n.language)}</p><p className="mt-2 text-sm text-stone-400">{Math.round(recipe.calories)} kcal · P {Math.round(recipe.protein)}g · C {Math.round(recipe.carbs)}g · G {Math.round(recipe.fat)}g</p><div className="mt-3 flex flex-wrap gap-1.5">{reasons.map((reason) => <span key={reason} className="rounded-full bg-leaf-500/10 px-2 py-1 text-[10px] font-semibold text-leaf-600">{reason}</span>)}</div><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-leaf-700">{t('Ver receita')} <ArrowRight size={15} /></span></Link>)}</div></section>}
    </div>
  );
}
