import { ArrowRight, Flame, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NutritionProgress, sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';

const currentDate = new Date();
const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

export default function DashboardPage() {
  const { entries, goals } = useMeals();
  const todayEntries = entries.filter((entry) => entry.date === today);
  const total = sumMacros(todayEntries);
  const remaining = Math.max(goals.calories - total.calories, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="font-semibold text-leaf-600">O teu dia nutricional</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Olá! O que vamos comer?</h1><p className="mt-2 text-stone-500">Acompanha as refeições e mantém os teus objetivos à vista.</p></div>
        <Link to="/receitas" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white hover:bg-leaf-700"><Plus size={19} /> Registar refeição</Link>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="card relative overflow-hidden bg-ink p-7 text-white">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-leaf-500/20 blur-2xl" />
          <div className="relative"><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-leaf-100"><Flame size={17} /> Calorias restantes</div><div className="mt-5 flex items-end gap-3"><span className="font-display text-6xl font-extrabold">{Math.round(remaining)}</span><span className="mb-2 text-stone-300">kcal</span></div><p className="mt-3 text-sm text-stone-300">Consumiste {Math.round(total.calories)} das {goals.calories} kcal planeadas.</p><div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.min(total.calories / goals.calories * 100, 100)}%` }} /></div></div>
        </div>
        <div className="card space-y-6 p-7">
          <h2 className="text-lg font-bold">Macronutrientes</h2>
          <NutritionProgress label="Proteína" value={total.protein} goal={goals.protein} unit="g" color="bg-sky-500" />
          <NutritionProgress label="Hidratos" value={total.carbs} goal={goals.carbs} unit="g" color="bg-amber-400" />
          <NutritionProgress label="Gordura" value={total.fat} goal={goals.fat} unit="g" color="bg-rose-400" />
        </div>
      </section>

      <section className="card mt-6 p-7">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Refeições de hoje</h2><p className="mt-1 text-sm text-stone-500">{todayEntries.length ? `${todayEntries.length} registo(s)` : 'Ainda não registaste nenhuma refeição.'}</p></div><Link to="/diario" className="flex items-center gap-1 text-sm font-bold text-leaf-600">Ver diário <ArrowRight size={16} /></Link></div>
        {todayEntries.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-400">Pesquisa uma receita para começares o teu dia.</div> : <div className="mt-6 divide-y divide-stone-100">{todayEntries.slice(-4).reverse().map((entry) => <div key={entry.id} className="flex items-center justify-between py-4"><div><p className="font-bold">{entry.recipeName}</p><p className="text-sm text-stone-400">{entry.mealType} · {entry.portions} porção(ões)</p></div><span className="font-bold">{entry.calories} kcal</span></div>)}</div>}
      </section>
    </div>
  );
}
