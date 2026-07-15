import { CalendarDays, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';
import { MealType } from '../types';

const types: MealType[] = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar'];

export default function DiaryPage() {
  const { entries, removeMeal } = useMeals();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const daily = entries.filter((entry) => entry.date === date);
  const total = sumMacros(daily);
  return (
    <div className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-semibold text-leaf-600">Histórico</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Diário de refeições</h1><p className="mt-2 text-stone-500">Consulta e gere tudo o que registaste.</p></div><label className="relative"><CalendarDays className="absolute left-4 top-3.5 text-stone-400" size={19} /><input className="input pl-12" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Summary value={Math.round(total.calories)} label="Calorias" unit="kcal" /><Summary value={Math.round(total.protein)} label="Proteína" unit="g" /><Summary value={Math.round(total.carbs)} label="Hidratos" unit="g" /><Summary value={Math.round(total.fat)} label="Gordura" unit="g" /></div>
      <div className="mt-6 space-y-4">{types.map((type) => { const meals = daily.filter((entry) => entry.mealType === type); return <section key={type} className="card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{type}</h2><span className="text-sm font-semibold text-stone-400">{Math.round(sumMacros(meals).calories)} kcal</span></div>{meals.length === 0 ? <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">Sem registos.</p> : <div className="mt-3 divide-y divide-white/10">{meals.map((meal) => <div key={meal.id} className="flex items-center justify-between py-3"><div><p className="font-semibold">{meal.recipeName}</p><p className="text-xs text-stone-400">{meal.portions} porção(ões) · P {meal.protein}g · H {meal.carbs}g · G {meal.fat}g</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold">{meal.calories} kcal</span><button onClick={() => removeMeal(meal.id)} aria-label="Remover refeição" className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={17} /></button></div></div>)}</div>}</section>; })}</div>
    </div>
  );
}

function Summary({ value, label, unit }: { value: number; label: string; unit: string }) { return <div className="card p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}<span className="ml-1 text-xs font-semibold text-stone-400">{unit}</span></p></div>; }
