import { AlertCircle, CalendarDays, CheckCircle2, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { MealEntry, MealType, Recipe } from '../types';
import { useMeals } from '../store/MealContext';
import { useTranslation } from 'react-i18next';
import { recipeName } from '../lib/recipe-language';

const mealTypes: MealType[] = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar'];
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const currentDate = () => formatLocalDate(new Date());
const previousDate = () => { const date = new Date(); date.setDate(date.getDate() - 1); return formatLocalDate(date); };
const suggestedMealDate = () => new Date().getHours() < 4 ? previousDate() : currentDate();

export default function AddMealModal({ recipe, entry, onClose }: { recipe: Recipe; entry?: MealEntry; onClose: () => void }) {
  const { addMeal, updateMeal } = useMeals();
  const { t, i18n } = useTranslation();
  const [mealType, setMealType] = useState<MealType>(entry?.mealType ?? 'Almoço');
  const [portions, setPortions] = useState(entry?.portions ?? 1);
  const [date, setDate] = useState(entry?.date ?? suggestedMealDate);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('idle');
    setMessage('');
    try {
      if (entry) await updateMeal(entry.id, recipe, mealType, portions, date);
      else await addMeal(recipe, mealType, portions, date);
      setStatus('success');
      setMessage(t(entry ? 'Registo alterado com sucesso.' : 'Refeição registada com sucesso.'));
      closeTimer.current = setTimeout(onClose, 1400);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t('Não foi possível registar a refeição.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm">
      <form onSubmit={submit} className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-leaf-600">{t(entry ? 'Editar registo' : 'Registar refeição')}</p><h2 className="mt-1 text-xl font-bold">{recipeName(recipe, i18n.language)}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-stone-100"><X /></button></div>
        <label className="mt-6 block text-sm font-semibold">{t('Dia da refeição')}<span className="relative mt-2 block"><CalendarDays className="pointer-events-none absolute left-4 top-3.5 text-stone-400" size={18} /><input className="input pl-12" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></span></label>
        <div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => setDate(currentDate())} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${date === currentDate() ? 'bg-leaf-600 text-white' : 'bg-white/5 text-stone-400 hover:text-white'}`}>{t('Hoje')}</button><button type="button" onClick={() => setDate(previousDate())} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${date === previousDate() ? 'bg-leaf-600 text-white' : 'bg-white/5 text-stone-400 hover:text-white'}`}>{t('Ontem')}</button></div>
        {new Date().getHours() < 4 && date === previousDate() && <p className="mt-2 text-xs text-stone-400">{t('Como ainda é antes das 04:00, sugerimos o dia anterior. Podes alterar se necessário.')}</p>}
        <label className="mt-5 block text-sm font-semibold">{t('Tipo de refeição')}<select className="input mt-2" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>{mealTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">{t('Número de porções')}<input className="input mt-2" type="number" min="0.25" step="0.25" value={portions} onChange={(e) => setPortions(Math.max(0.25, Number(e.target.value)))} /></label>
        <div className="mt-5 rounded-2xl bg-leaf-50 p-4 text-sm text-leaf-700"><strong>{Math.round(recipe.calories * portions)} kcal</strong> · {Math.round(recipe.protein * portions)}g {t('proteína')} · {Math.round(recipe.carbs * portions)}g {t('hidratos')} · {Math.round(recipe.fat * portions)}g {t('gordura')}</div>
        {status !== 'idle' && <div role="status" className={`mt-5 flex items-center gap-2 rounded-2xl p-4 text-sm font-semibold ${status === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{status === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}<span>{message}</span></div>}
        <button disabled={status === 'success'} className="mt-6 w-full rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white hover:bg-leaf-700 disabled:opacity-60">{t(status === 'success' ? (entry ? 'Alterações guardadas' : 'Registado') : (entry ? 'Guardar alterações' : 'Adicionar ao diário'))}</button>
      </form>
    </div>
  );
}
