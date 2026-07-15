export type MealType = 'Pequeno-almoço' | 'Almoço' | 'Lanche' | 'Jantar';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe extends Macros {
  id: string;
  name: string;
  description: string;
  category: string;
  prepMinutes: number;
  servings: number;
  imageColor: string;
  ingredients: string[];
}

export interface MealEntry extends Macros {
  id: string;
  recipeId: string;
  recipeName: string;
  date: string;
  mealType: MealType;
  portions: number;
}

export type NutritionGoals = Macros;
