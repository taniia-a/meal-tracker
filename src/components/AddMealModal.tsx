import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { MealType, Recipe } from '../types';
import { useMeals } from '../store/MealContext';

const mealTypes: MealType[] = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar'];

export default function AddMealModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { addMeal } = useMeals();
  const [mealType, setMealType] = useState<MealType>('Almoço');
  const [portions, setPortions] = useState(1);
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
      await addMeal(recipe, mealType, portions);
      setStatus('success');
      setMessage('Refeição registada com sucesso.');
      closeTimer.current = setTimeout(onClose, 1400);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível registar a refeição.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5 backdrop-blur-sm">
      <form onSubmit={submit} className="card w-full max-w-md p-6">
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-leaf-600">Registar refeição</p><h2 className="mt-1 text-xl font-bold">{recipe.name}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-stone-100"><X /></button></div>
        <label className="mt-6 block text-sm font-semibold">Tipo de refeição<select className="input mt-2" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>{mealTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Número de porções<input className="input mt-2" type="number" min="0.25" step="0.25" value={portions} onChange={(e) => setPortions(Math.max(0.25, Number(e.target.value)))} /></label>
        <div className="mt-5 rounded-2xl bg-leaf-50 p-4 text-sm text-leaf-700"><strong>{Math.round(recipe.calories * portions)} kcal</strong> · {Math.round(recipe.protein * portions)}g proteína · {Math.round(recipe.carbs * portions)}g hidratos · {Math.round(recipe.fat * portions)}g gordura</div>
        {status !== 'idle' && <div role="status" className={`mt-5 flex items-center gap-2 rounded-2xl p-4 text-sm font-semibold ${status === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{status === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}<span>{message}</span></div>}
        <button disabled={status === 'success'} className="mt-6 w-full rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white hover:bg-leaf-700 disabled:opacity-60">{status === 'success' ? 'Registado' : 'Adicionar ao diário'}</button>
      </form>
    </div>
  );
}
