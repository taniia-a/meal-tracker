import { CalendarDays, ChevronLeft, ChevronRight, Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddMealModal from '../components/AddMealModal';
import { sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';
import { MealEntry, MealType } from '../types';
import { addShoppingEntryIds } from '../lib/shopping-list';
import { formatLocalDate, nutritionDay } from '../lib/nutrition-day';

const types: MealType[] = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar'];
const formatDateValue = formatLocalDate;
const parseDateValue = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12); };
const today = nutritionDay();

function weekFrom(dateValue: string) {
  const date = parseDateValue(dateValue);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return formatDateValue(day); });
}

export default function DiaryPage() {
  const { entries, recipes, profile, removeMeal } = useMeals();
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [shoppingMessage, setShoppingMessage] = useState('');
  const daily = entries.filter((entry) => entry.date === date);
  const total = sumMacros(daily);
  const week = useMemo(() => weekFrom(date), [date]);
  const locale = i18n.language.startsWith('en') ? 'en-GB' : 'pt-PT';

  const deleteEntry = async (entryId: string) => {
    setDeleteError('');
    try { await removeMeal(entryId); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : t('Não foi possível apagar o registo.')); }
  };

  const moveWeek = (amount: number) => {
    const next = parseDateValue(week[0]);
    next.setDate(next.getDate() + amount * 7);
    setDate(formatDateValue(next));
  };

  const openDay = (day: string) => { setDate(day); setView('day'); };
  const addWeekToShoppingList = () => {
    const entryIds = entries.filter((entry) => week.includes(entry.date) && entry.date > today).map((entry) => entry.id);
    if (!entryIds.length) { setShoppingMessage(t('Não existem refeições futuras nesta semana.')); return; }
    addShoppingEntryIds(profile.userId, entryIds);
    setShoppingMessage(t('{{count}} refeição(ões) adicionada(s) à lista de compras.', { count: entryIds.length }));
  };
  const entryName = (entry: MealEntry) => i18n.language.startsWith('en') && entry.recipeNameEn ? entry.recipeNameEn : entry.recipeName;

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="font-semibold text-leaf-600">{t('Histórico')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Diário de refeições')}</h1><p className="mt-2 text-stone-500">{t('Consulta e gere tudo o que registaste.')}</p></div><div className="flex flex-col gap-3 sm:flex-row"><div className="flex rounded-2xl border border-white/10 bg-white/5 p-1"><button onClick={() => setView('day')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${view === 'day' ? 'bg-leaf-600 text-white' : 'text-stone-400'}`}>{t('Dia')}</button><button onClick={() => setView('week')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${view === 'week' ? 'bg-leaf-600 text-white' : 'text-stone-400'}`}>{t('Semana')}</button></div>{view === 'day' && <label className="relative w-44"><CalendarDays className="absolute left-4 top-3.5 text-stone-400" size={19} /><input className="input !w-44 !pl-12" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>}</div></div>

    {deleteError && <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">{deleteError}</p>}{shoppingMessage && <p role="status" className="mt-5 rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300">{shoppingMessage}</p>}

    {view === 'day' ? <>
      <p className="mt-8 text-sm font-bold text-stone-400">{t('Totais previstos')}</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Summary value={Math.round(total.calories)} label={t('Calorias')} unit="kcal" /><Summary value={Math.round(total.protein)} label={t('Proteína')} unit="g" /><Summary value={Math.round(total.carbs)} label={t('Hidratos')} unit="g" /><Summary value={Math.round(total.fat)} label={t('Gordura')} unit="g" /></div>
      <div className="mt-6 space-y-4">{types.map((type) => { const meals = daily.filter((entry) => entry.mealType === type); return <section key={type} className="card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t(type)}</h2><span className="text-sm font-semibold text-stone-400">{Math.round(sumMacros(meals).calories)} kcal</span></div>{meals.length === 0 ? <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">{t('Sem registos.')}</p> : <div className="mt-3 divide-y divide-white/10">{meals.map((meal) => { const consumed = meal.date <= today; return <div key={meal.id} className="flex items-center justify-between gap-3 py-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{entryName(meal)}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${consumed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{t(consumed ? 'Consumida' : 'Planeada')}</span></div><p className="text-xs text-stone-400">{t('{{count}} porção(ões)', { count: meal.portions })} · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g</p></div><div className="flex items-center gap-2"><span className="mr-1 text-sm font-bold">{meal.calories} kcal</span><button onClick={() => setEditing(meal)} aria-label={t('Editar registo')} className="rounded-xl p-2 text-stone-400 hover:bg-leaf-500/10 hover:text-leaf-700"><Pencil size={17} /></button><button onClick={() => deleteEntry(meal.id)} aria-label={t('Remover refeição')} className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={17} /></button></div></div>; })}</div>}</section>; })}</div>
    </> : <WeeklyView week={week} entries={entries} locale={locale} today={today} onPrevious={() => moveWeek(-1)} onNext={() => moveWeek(1)} onCurrent={() => setDate(today)} onOpenDay={openDay} onAddToShoppingList={addWeekToShoppingList} />}

    {editing && (() => { const recipe = recipes.find((item) => item.id === editing.recipeId); return recipe ? <AddMealModal recipe={recipe} entry={editing} onClose={() => setEditing(null)} /> : null; })()}
  </div>;
}

function WeeklyView({ week, entries, locale, today: currentDay, onPrevious, onNext, onCurrent, onOpenDay, onAddToShoppingList }: { week: string[]; entries: MealEntry[]; locale: string; today: string; onPrevious: () => void; onNext: () => void; onCurrent: () => void; onOpenDay: (day: string) => void; onAddToShoppingList: () => void }) {
  const { t, i18n } = useTranslation();
  const first = parseDateValue(week[0]); const last = parseDateValue(week[6]);
  const range = `${first.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><button onClick={onCurrent} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5">{t('Semana atual')}</button><div className="flex items-center gap-3"><button onClick={onPrevious} className="rounded-xl border border-white/10 p-2 hover:bg-white/5" aria-label={t('Semana anterior')}><ChevronLeft /></button><h2 className="min-w-44 text-center font-bold capitalize">{range}</h2><button onClick={onNext} className="rounded-xl border border-white/10 p-2 hover:bg-white/5" aria-label={t('Semana seguinte')}><ChevronRight /></button></div><button onClick={onAddToShoppingList} className="inline-flex items-center gap-2 rounded-xl bg-leaf-600 px-4 py-2 text-sm font-bold text-white"><ShoppingCart size={17} /> {t('Adicionar semana às compras')}</button></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7">{week.map((day) => { const meals = entries.filter((entry) => entry.date === day); const total = sumMacros(meals); const date = parseDateValue(day); return <article key={day} className={`card flex min-h-72 flex-col p-4 ${day === currentDay ? 'border-leaf-500/50 ring-1 ring-leaf-500/20' : ''}`}><button onClick={() => onOpenDay(day)} className="text-left"><p className="text-xs font-bold uppercase text-leaf-700">{date.toLocaleDateString(locale, { weekday: 'short' })}</p><p className="mt-1 text-2xl font-extrabold">{date.getDate()}</p></button><div className="mt-4 rounded-xl bg-white/5 p-3"><p className="font-bold">{Math.round(total.calories)} kcal</p><p className="mt-1 text-[10px] text-stone-400">P {Math.round(total.protein)}g · C {Math.round(total.carbs)}g · F {Math.round(total.fat)}g</p></div><div className="mt-3 flex-1 space-y-2">{meals.length ? meals.map((meal) => <button key={meal.id} onClick={() => onOpenDay(day)} className={`block w-full rounded-xl p-2 text-left ${meal.isConsumed ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}><span className="block truncate text-xs font-bold">{i18n.language.startsWith('en') && meal.recipeNameEn ? meal.recipeNameEn : meal.recipeName}</span><span className={`text-[10px] ${meal.isConsumed ? 'text-emerald-300' : 'text-amber-300'}`}>{t(meal.mealType)} · {t(meal.isConsumed ? 'Consumida' : 'Planeada')}</span></button>) : <p className="py-3 text-center text-xs text-stone-500">{t('Sem refeições')}</p>}</div><button onClick={() => onOpenDay(day)} className="mt-3 text-xs font-bold text-leaf-700">{t('Ver dia')}</button></article>; })}</div>
  </section>;
}

function Summary({ value, label, unit }: { value: number; label: string; unit: string }) { return <div className="card p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}<span className="ml-1 text-xs font-semibold text-stone-400">{unit}</span></p></div>; }
