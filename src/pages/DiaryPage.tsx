import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AddMealModal from '../components/AddMealModal';
import { sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';
import { MealEntry, MealType } from '../types';
import { useTranslation } from 'react-i18next';

const types: MealType[] = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar'];
const currentDate = new Date();
const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

export default function DiaryPage() {
  const { entries, recipes, removeMeal } = useMeals();
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(today);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const daily = entries.filter((entry) => entry.date === date);
  const total = sumMacros(daily);
  const deleteEntry = async (entryId: string) => {
    setDeleteError('');
    try { await removeMeal(entryId); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : t('Não foi possível apagar o registo.')); }
  };
  return (
    <div className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-semibold text-leaf-600">{t('Histórico')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Diário de refeições')}</h1><p className="mt-2 text-stone-500">{t('Consulta e gere tudo o que registaste.')}</p></div><label className="relative"><CalendarDays className="absolute left-4 top-3.5 text-stone-400" size={19} /><input className="input pl-12" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Summary value={Math.round(total.calories)} label={t('Calorias')} unit="kcal" /><Summary value={Math.round(total.protein)} label={t('Proteína')} unit="g" /><Summary value={Math.round(total.carbs)} label={t('Hidratos')} unit="g" /><Summary value={Math.round(total.fat)} label={t('Gordura')} unit="g" /></div>
      {deleteError && <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">{deleteError}</p>}
      <div className="mt-6 space-y-4">{types.map((type) => { const meals = daily.filter((entry) => entry.mealType === type); return <section key={type} className="card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t(type)}</h2><span className="text-sm font-semibold text-stone-400">{Math.round(sumMacros(meals).calories)} kcal</span></div>{meals.length === 0 ? <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">{t('Sem registos.')}</p> : <div className="mt-3 divide-y divide-white/10">{meals.map((meal) => <div key={meal.id} className="flex items-center justify-between py-3"><div><p className="font-semibold">{i18n.language.startsWith('en') && meal.recipeNameEn ? meal.recipeNameEn : meal.recipeName}</p><p className="text-xs text-stone-400">{t('{{count}} porção(ões)', { count: meal.portions })} · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g</p></div><div className="flex items-center gap-2"><span className="mr-1 text-sm font-bold">{meal.calories} kcal</span><button onClick={() => setEditing(meal)} aria-label={t('Editar registo')} className="rounded-xl p-2 text-stone-400 hover:bg-leaf-500/10 hover:text-leaf-700"><Pencil size={17} /></button><button onClick={() => deleteEntry(meal.id)} aria-label={t('Remover refeição')} className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={17} /></button></div></div>)}</div>}</section>; })}</div>
      {editing && (() => { const recipe = recipes.find((item) => item.id === editing.recipeId); return recipe ? <AddMealModal recipe={recipe} entry={editing} onClose={() => setEditing(null)} /> : null; })()}
    </div>
  );
}

function Summary({ value, label, unit }: { value: number; label: string; unit: string }) { return <div className="card p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}<span className="ml-1 text-xs font-semibold text-stone-400">{unit}</span></p></div>; }
