import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { demoRecipes } from '../data/recipes';
import { MealEntry, MealType, NutritionGoals, Recipe } from '../types';

interface MealContextValue {
  recipes: Recipe[];
  entries: MealEntry[];
  goals: NutritionGoals;
  addMeal: (recipe: Recipe, mealType: MealType, portions: number, date?: string) => void;
  removeMeal: (id: string) => void;
}

const MealContext = createContext<MealContextValue | null>(null);
const today = () => new Date().toISOString().slice(0, 10);

export function MealProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const goals = useMemo(() => ({ calories: 2000, protein: 130, carbs: 230, fat: 65 }), []);

  const addMeal = (recipe: Recipe, mealType: MealType, portions: number, date = today()) => {
    const scale = (value: number) => Math.round(value * portions * 10) / 10;
    setEntries((current) => [...current, {
      id: crypto.randomUUID(), recipeId: recipe.id, recipeName: recipe.name, date, mealType, portions,
      calories: scale(recipe.calories), protein: scale(recipe.protein),
      carbs: scale(recipe.carbs), fat: scale(recipe.fat)
    }]);
  };

  const removeMeal = (id: string) => setEntries((current) => current.filter((entry) => entry.id !== id));

  return (
    <MealContext.Provider value={{ recipes: demoRecipes, entries, goals, addMeal, removeMeal }}>
      {children}
    </MealContext.Provider>
  );
}

export function useMeals() {
  const context = useContext(MealContext);
  if (!context) throw new Error('useMeals deve ser usado dentro de MealProvider');
  return context;
}
