import { Macros } from '../types';

interface Props { label: string; value: number; goal: number; unit: string; color: string; }

export function NutritionProgress({ label, value, goal, unit, color }: Props) {
  const percentage = Math.min((value / goal) * 100, 100);
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm font-semibold text-stone-300">{label}</span>
        <span className="text-sm"><strong>{Math.round(value)}</strong><span className="text-stone-400"> / {goal}{unit}</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div>
    </div>
  );
}

export const sumMacros = (items: Macros[]): Macros => items.reduce((total, item) => ({
  calories: total.calories + item.calories,
  protein: total.protein + item.protein,
  carbs: total.carbs + item.carbs,
  fat: total.fat + item.fat,
}), { calories: 0, protein: 0, carbs: 0, fat: 0 });
