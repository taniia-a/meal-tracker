import { ArrowRight, Flame, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NutritionProgress, sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';
import { recipeName } from '../lib/recipe-language';
import { nutritionDay } from '../lib/nutrition-day';

export default function DashboardPage() {
  const { entries, goals, recipes } = useMeals();
  const { t, i18n } = useTranslation();
  const today = nutritionDay();
  const todayEntries = entries.filter((entry) => entry.date === today);
  const total = sumMacros(todayEntries);
  const remaining = Math.max(goals.calories - total.calories, 0);
  const dinnerMissing = !todayEntries.some((entry) => entry.mealType === 'Jantar');
  const suggestions = dinnerMissing ? recipes.filter((recipe) => recipe.category === 'Almoço/Jantar').map((recipe) => {
    const macroScore = Math.abs(Math.max(goals.protein - total.protein, 0) - recipe.protein) / Math.max(goals.protein, 1)
      + Math.abs(Math.max(goals.carbs - total.carbs, 0) - recipe.carbs) / Math.max(goals.carbs, 1)
      + Math.abs(Math.max(goals.fat - total.fat, 0) - recipe.fat) / Math.max(goals.fat, 1);
    const calorieScore = Math.abs(remaining - recipe.calories) / Math.max(goals.calories, 1);
    return { recipe, score: macroScore + calorieScore };
  }).sort((a, b) => a.score - b.score).slice(0, 3) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="font-semibold text-leaf-600">{t('O teu dia nutricional')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Olá! O que vamos comer?')}</h1><p className="mt-2 text-stone-500">{t('Acompanha as refeições e mantém os teus objetivos à vista.')}</p></div>
        <Link to="/receitas" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white hover:bg-leaf-700"><Plus size={19} /> {t('Registar refeição')}</Link>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="card relative overflow-hidden bg-ink p-7 text-white">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-leaf-500/20 blur-2xl" />
          <div className="relative"><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-leaf-100"><Flame size={17} /> {t('Calorias restantes')}</div><div className="mt-5 flex items-end gap-3"><span className="font-display text-6xl font-extrabold">{Math.round(remaining)}</span><span className="mb-2 text-stone-300">kcal</span></div><p className="mt-3 text-sm text-stone-300">{t('Consumiste {{consumed}} das {{goal}} kcal planeadas.', { consumed: Math.round(total.calories), goal: goals.calories })}</p><div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.min(total.calories / goals.calories * 100, 100)}%` }} /></div></div>
        </div>
        <div className="card space-y-6 p-7">
          <h2 className="text-lg font-bold">{t('Macronutrientes')}</h2>
          <NutritionProgress label={t('Proteína')} value={total.protein} goal={goals.protein} unit="g" color="bg-sky-500" />
          <NutritionProgress label={t('Hidratos')} value={total.carbs} goal={goals.carbs} unit="g" color="bg-amber-400" />
          <NutritionProgress label={t('Gordura')} value={total.fat} goal={goals.fat} unit="g" color="bg-rose-400" />
        </div>
      </section>

      <section className="card mt-6 p-7">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{t('Refeições de hoje')}</h2><p className="mt-1 text-sm text-stone-500">{todayEntries.length ? t('{{count}} registo(s)', { count: todayEntries.length }) : t('Ainda não registaste nenhuma refeição.')}</p></div><Link to="/diario" className="flex items-center gap-1 text-sm font-bold text-leaf-600">{t('Ver diário')} <ArrowRight size={16} /></Link></div>
        {todayEntries.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-400">{t('Pesquisa uma receita para começares o teu dia.')}</div> : <div className="mt-6 divide-y divide-stone-100">{todayEntries.slice(-4).reverse().map((entry) => <div key={entry.id} className="flex items-center justify-between py-4"><div><p className="font-bold">{i18n.language.startsWith('en') && entry.recipeNameEn ? entry.recipeNameEn : entry.recipeName}</p><p className="text-sm text-stone-400">{t(entry.mealType)} · {t('{{count}} porção(ões)', { count: entry.portions })}</p></div><span className="font-bold">{entry.calories} kcal</span></div>)}</div>}
      </section>
      {dinnerMissing && suggestions.length > 0 && <section className="card mt-6 p-7"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf-600/15 text-leaf-700"><Sparkles size={21} /></div><div><h2 className="text-xl font-bold">{t('Sugestões para o jantar')}</h2><p className="mt-1 text-sm text-stone-400">{t('Receitas escolhidas com base no que falta para os teus objetivos de hoje.')}</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-3">{suggestions.map(({ recipe }) => <Link key={recipe.id} to={`/receitas/${recipe.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-leaf-500/40 hover:bg-white/[0.06]"><p className="font-bold">{recipeName(recipe, i18n.language)}</p><p className="mt-2 text-sm text-stone-400">{Math.round(recipe.calories)} kcal · P {Math.round(recipe.protein)}g · C {Math.round(recipe.carbs)}g · G {Math.round(recipe.fat)}g</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-leaf-700">{t('Ver receita')} <ArrowRight size={15} /></span></Link>)}</div></section>}
    </div>
  );
}
