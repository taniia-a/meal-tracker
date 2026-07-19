import { Bot, CalendarDays, ChevronLeft, ChevronRight, Droplets, Pencil, Plus, Search, ShoppingCart, Sparkles, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddMealModal from '../components/AddMealModal';
import { sumMacros } from '../components/NutritionProgress';
import { useMeals } from '../store/MealContext';
import { ManualMealInput, MealEntry, MealType, Recipe } from '../types';
import { addShoppingEntryIds } from '../lib/shopping-list';
import { formatLocalDate, nutritionDay } from '../lib/nutrition-day';
import { recipeName } from '../lib/recipe-language';
import { getAuthToken } from '../lib/auth';

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
  const { entries, recipes, profile, removeMeal, waterEntries, removeWater, adjustWater } = useMeals();
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [adding, setAdding] = useState<Recipe | null>(null);
  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [isManualMealModalOpen, setIsManualMealModalOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<MealEntry | null>(null);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [shoppingMessage, setShoppingMessage] = useState('');
  const daily = entries.filter((entry) => entry.date === date);
  const dailyWater = waterEntries.filter((entry) => entry.date === date);
  const total = sumMacros(daily);
  const week = useMemo(() => weekFrom(date), [date]);
  const locale = i18n.language.startsWith('en') ? 'en-GB' : 'pt-PT';

  const deleteEntry = async (entryId: string) => {
    setDeleteError('');
    try { await removeMeal(entryId); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : t('Não foi possível apagar o registo.')); }
  };
  const deleteWaterEntry = async (entryId: string) => {
    setDeleteError('');
    try { await removeWater(entryId); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : t('Não foi possível apagar o registo de água.')); }
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
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="font-semibold text-leaf-600">{t('Histórico')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Diário de refeições')}</h1><p className="mt-2 text-stone-500">{t('Consulta e gere tudo o que registaste.')}</p></div><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end"><button onClick={() => setIsRecipePickerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf-600 px-4 py-3 text-sm font-bold text-white"><Search size={18} /> {t('Pesquisar receitas')}</button><button onClick={() => setIsManualMealModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-leaf-500/40 px-4 py-3 text-sm font-bold text-leaf-600 hover:bg-leaf-500/10"><Plus size={18} /> {t('Refeição manual')}</button><div className="flex rounded-2xl border border-white/10 bg-white/5 p-1"><button onClick={() => setView('day')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${view === 'day' ? 'bg-leaf-600 text-white' : 'text-stone-400'}`}>{t('Dia')}</button><button onClick={() => setView('week')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold ${view === 'week' ? 'bg-leaf-600 text-white' : 'text-stone-400'}`}>{t('Semana')}</button></div>{view === 'day' && <label className="relative w-44"><CalendarDays className="absolute left-4 top-3.5 text-stone-400" size={19} /><input className="input !w-44 !pl-12" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>}</div></div>

    {deleteError && <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">{deleteError}</p>}{shoppingMessage && <p role="status" className="mt-5 rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300">{shoppingMessage}</p>}

    {view === 'day' ? <>
      <p className="mt-8 text-sm font-bold text-stone-400">{t('Totais previstos')}</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Summary value={Math.round(total.calories)} label={t('Calorias')} unit="kcal" /><Summary value={Math.round(total.protein)} label={t('Proteína')} unit="g" /><Summary value={Math.round(total.carbs)} label={t('Hidratos')} unit="g" /><Summary value={Math.round(total.fat)} label={t('Gordura')} unit="g" /></div>
      <section className="card mt-6 p-6"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-400"><Droplets size={20} /></div><div><h2 className="font-bold">{t('Água')}</h2><p className="text-sm text-stone-400">{t('{{count}} movimento(s)', { count: dailyWater.length })}</p></div></div><div className="flex items-center gap-3"><span className="text-lg font-extrabold text-sky-300">{dailyWater.reduce((sum, entry) => sum + entry.amountMl, 0)} ml</span><button onClick={() => setIsWaterModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 px-3 py-2 text-sm font-bold text-sky-300 hover:bg-sky-500/10"><Plus size={17} /> {t('Adicionar água')}</button></div></div>{dailyWater.length ? <div className="mt-3 divide-y divide-white/10">{dailyWater.map((entry) => <div key={entry.id} className="flex items-center justify-between py-3"><span className="font-semibold">+{entry.amountMl} ml</span><button onClick={() => void deleteWaterEntry(entry.id)} aria-label={t('Apagar registo de água')} className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={17} /></button></div>)}</div> : <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">{t('Ainda não registaste água neste dia.')}</p>}</section>
      <div className="mt-6 space-y-4">{types.map((type) => { const meals = daily.filter((entry) => entry.mealType === type); return <section key={type} className="card p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t(type)}</h2><span className="text-sm font-semibold text-stone-400">{Math.round(sumMacros(meals).calories)} kcal</span></div>{meals.length === 0 ? <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-stone-400">{t('Sem registos.')}</p> : <div className="mt-3 divide-y divide-white/10">{meals.map((meal) => { const consumed = meal.date <= today; return <div key={meal.id} className="flex items-center justify-between gap-3 py-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{entryName(meal)}</p>{meal.isManual && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-300">{t('Manual')}</span>}<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${consumed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{t(consumed ? 'Consumida' : 'Planeada')}</span></div><p className="text-xs text-stone-400">{meal.isManual ? t('Valores introduzidos manualmente.') : t('{{count}} porção(ões)', { count: meal.portions })} · P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g</p></div><div className="flex items-center gap-2"><span className="mr-1 text-sm font-bold">{meal.calories} kcal</span><button onClick={() => meal.isManual ? setEditingManual(meal) : setEditing(meal)} aria-label={t('Editar registo')} className="rounded-xl p-2 text-stone-400 hover:bg-leaf-500/10 hover:text-leaf-700"><Pencil size={17} /></button><button onClick={() => deleteEntry(meal.id)} aria-label={t('Remover refeição')} className="rounded-xl p-2 text-stone-400 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={17} /></button></div></div>; })}</div>}</section>; })}</div>
    </> : <WeeklyView week={week} entries={entries} locale={locale} today={today} onPrevious={() => moveWeek(-1)} onNext={() => moveWeek(1)} onCurrent={() => setDate(today)} onOpenDay={openDay} onAddToShoppingList={addWeekToShoppingList} />}

    {isRecipePickerOpen && <RecipePicker recipes={recipes} onClose={() => setIsRecipePickerOpen(false)} onSelect={(recipe) => { setAdding(recipe); setIsRecipePickerOpen(false); }} />}
    {isManualMealModalOpen && <ManualMealModal date={date} onClose={() => setIsManualMealModalOpen(false)} />}
    {editingManual && <ManualMealModal entry={editingManual} date={editingManual.date} onClose={() => setEditingManual(null)} />}
    {isWaterModalOpen && <AddWaterModal date={date} onClose={() => setIsWaterModalOpen(false)} onSave={adjustWater} />}
    {adding && <AddMealModal recipe={adding} initialDate={date} onClose={() => setAdding(null)} />}
    {editing && (() => { const recipe = recipes.find((item) => item.id === editing.recipeId); return recipe ? <AddMealModal recipe={recipe} entry={editing} onClose={() => setEditing(null)} /> : null; })()}
  </div>;
}

function AddWaterModal({ date, onClose, onSave }: { date: string; onClose: () => void; onSave: (amountMl: number, entryDate: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('100');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountMl = Number(amount);
    if (!Number.isFinite(amountMl) || amountMl <= 0) { setError(t('Introduz uma quantidade de água válida.')); return; }
    setSaving(true); setError('');
    try { await onSave(amountMl, date); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('Não foi possível atualizar a água.')); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm"><form onSubmit={submit} className="card w-full max-w-sm p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-sky-400">{t('Água')}</p><h2 className="mt-1 text-xl font-bold">{t('Adicionar água')}</h2><p className="mt-1 text-sm text-stone-400">{date}</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/5" aria-label={t('Cancelar')}><X /></button></div><label className="mt-6 block text-sm font-semibold">{t('Quantidade de água (ml)')}<div className="relative mt-2"><input autoFocus type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="input pr-10" /><span className="pointer-events-none absolute right-4 top-3.5 text-sm text-stone-400">ml</span></div></label>{error && <p role="alert" className="mt-4 text-sm font-semibold text-rose-400">{error}</p>}<button disabled={saving || !amount} className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? t('A guardar...') : t('Adicionar água')}</button></form></div>;
}

function ManualMealModal({ date, entry, onClose }: { date: string; entry?: MealEntry; onClose: () => void }) {
  const { addManualMeal, updateManualMeal } = useMeals();
  const { t } = useTranslation();
  const [name, setName] = useState(entry?.recipeName ?? '');
  const [entryDate, setEntryDate] = useState(entry?.date ?? date);
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? 'Almoço');
  const [calories, setCalories] = useState(entry ? String(entry.calories) : '');
  const [protein, setProtein] = useState(entry?.protein ? String(entry.protein) : '');
  const [carbs, setCarbs] = useState(entry?.carbs ? String(entry.carbs) : '');
  const [fat, setFat] = useState(entry?.fat ? String(entry.fat) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [estimating, setEstimating] = useState(false);
  const toNumber = (value: string) => value === '' ? 0 : Number(value);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const caloriesValue = Number(calories);
    if (!name.trim() || !Number.isFinite(caloriesValue) || caloriesValue <= 0) {
      setError(t('Indica o nome e as calorias da refeição.'));
      return;
    }
    const meal: ManualMealInput = { name, date: entryDate, mealType, calories: caloriesValue, protein: toNumber(protein), carbs: toNumber(carbs), fat: toNumber(fat) };
    if (![meal.protein, meal.carbs, meal.fat].every(Number.isFinite)) { setError(t('Introduz valores nutricionais válidos.')); return; }
    setSaving(true); setError('');
    try { if (entry) await updateManualMeal(entry.id, meal); else await addManualMeal(meal); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('Não foi possível registar a refeição.')); }
    finally { setSaving(false); }
  };
  const estimateWithAi = async () => {
    if (!aiDescription.trim()) { setError(t('Descreve primeiro o que comeste.')); return; }
    setEstimating(true); setError(''); setAiNote('');
    try {
      const token = await getAuthToken();
      if (!token) throw new Error(t('A tua sessão expirou. Inicia sessão novamente.'));
      const response = await fetch('/api/meal-estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, description: aiDescription, language: document.documentElement.lang }) });
      const text = await response.text();
      let data: { name?: string; calories?: number; protein?: number; carbs?: number; fat?: number; note?: string; error?: string };
      try { data = JSON.parse(text) as typeof data; }
      catch { throw new Error(t('A estimativa por IA só está disponível no ambiente Vercel. Faz deploy ou inicia com vercel dev.')); }
      if (!response.ok || !data.name) throw new Error(data.error || t('Não foi possível obter uma estimativa agora.'));
      setName(data.name); setCalories(String(data.calories ?? '')); setProtein(data.protein ? String(data.protein) : ''); setCarbs(data.carbs ? String(data.carbs) : ''); setFat(data.fat ? String(data.fat) : ''); setAiNote(data.note ?? '');
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('Não foi possível obter uma estimativa agora.')); }
    finally { setEstimating(false); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-5 backdrop-blur-sm"><form onSubmit={submit} className="card my-5 w-full max-w-md p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-leaf-600">{t('Diário')}</p><h2 className="mt-1 text-xl font-bold">{t('Refeição manual')}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/5" aria-label={t('Cancelar')}><X /></button></div><section className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-4"><div className="flex items-center gap-2"><Bot className="text-purple-300" size={18} /><p className="font-bold text-purple-100">{t('Estimar com IA')}</p></div><p className="mt-2 text-xs leading-relaxed text-stone-300">{t('Descreve o que comeste e a IA preenche uma estimativa que podes alterar antes de guardar.')}</p><textarea className="input mt-3 min-h-24 resize-y" value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder={t('Ex.: comi uma sandes de frango grelhado com queijo e um galão.')} maxLength={1500} /><button type="button" disabled={estimating || !aiDescription.trim()} onClick={() => void estimateWithAi()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Sparkles size={16} /> {estimating ? t('A estimar...') : t('Estimar valores')}</button>{aiNote && <p className="mt-3 text-xs text-stone-300">{aiNote}</p>}</section><label className="mt-5 block text-sm font-semibold">{t('Dia da refeição')}<input className="input mt-2" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required /></label><label className="mt-4 block text-sm font-semibold">{t('Nome da refeição')}<input autoFocus className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} required /></label><label className="mt-4 block text-sm font-semibold">{t('Tipo de refeição')}<select className="input mt-2" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{types.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">{t('Calorias')}<div className="relative mt-2"><input className="input pr-12" type="number" inputMode="decimal" min="1" step="1" required value={calories} onChange={(event) => setCalories(event.target.value)} /><span className="pointer-events-none absolute right-4 top-3.5 text-sm text-stone-400">kcal</span></div></label><div className="mt-4 grid grid-cols-3 gap-3"><MacroInput label="Proteína" value={protein} onChange={setProtein} /><MacroInput label="Hidratos" value={carbs} onChange={setCarbs} /><MacroInput label="Gordura" value={fat} onChange={setFat} /></div><p className="mt-3 text-xs text-stone-400">{t('Os macros são opcionais. Se não os souberes, podes deixar em branco.')}</p>{error && <p role="alert" className="mt-4 text-sm font-semibold text-rose-400">{error}</p>}<button disabled={saving} className="mt-6 w-full rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? t('A guardar...') : t(entry ? 'Guardar alterações' : 'Adicionar ao diário')}</button></form></div>;
}

function MacroInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return <label className="text-xs font-semibold text-stone-400">{t(label)}<div className="relative mt-2"><input className="input px-3 py-2 pr-7" type="number" inputMode="decimal" min="0" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} /><span className="pointer-events-none absolute right-2 top-2.5 text-[10px] text-stone-400">g</span></div></label>;
}

function RecipePicker({ recipes, onClose, onSelect }: { recipes: Recipe[]; onClose: () => void; onSelect: (recipe: Recipe) => void }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const normalise = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const terms = normalise(query).trim().split(/\s+/).filter(Boolean);
  const filtered = recipes.filter((recipe) => {
    const searchable = [recipe.name, recipe.nameEn, ...recipe.ingredients, ...recipe.ingredientsEn].map(normalise);
    return terms.every((term) => searchable.some((value) => value.includes(term)));
  }).slice(0, 30);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm"><section className="card flex max-h-[80vh] w-full max-w-xl flex-col p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-leaf-600">{t('Diário')}</p><h2 className="mt-1 text-xl font-bold">{t('Adicionar refeição')}</h2><p className="mt-1 text-sm text-stone-400">{t('Pesquisa uma receita para registar no diário.')}</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/5" aria-label={t('Cancelar')}><X /></button></div><label className="relative mt-5"><Search className="absolute left-4 top-3.5 text-stone-400" size={19} /><input autoFocus className="input !pl-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Ex.: frango, aveia, salmão...')} /></label><div className="mt-4 min-h-0 space-y-2 overflow-y-auto pr-1">{filtered.length ? filtered.map((recipe) => <button key={recipe.id} type="button" onClick={() => onSelect(recipe)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 p-4 text-left transition hover:border-leaf-500/50 hover:bg-white/5"><div><p className="font-bold">{recipeName(recipe, i18n.language)}</p><p className="mt-1 text-xs text-stone-400">{Math.round(recipe.calories)} kcal · P {Math.round(recipe.protein)}g · C {Math.round(recipe.carbs)}g · G {Math.round(recipe.fat)}g</p></div><Plus className="shrink-0 text-leaf-600" size={20} /></button>) : <p className="rounded-2xl bg-white/5 p-5 text-center text-sm text-stone-400">{t('Nenhuma receita encontrada.')}</p>}</div></section></div>;
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
