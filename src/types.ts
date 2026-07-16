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
  category: string;
  prepMinutes: number;
  servings: number;
  imageUrl: string | null;
  imageColor: string;
  ingredients: string[];
  instructions: string;
  ownerId: string;
  isPublic: boolean;
}

export interface RecipeInput extends Macros {
  name: string;
  category: string;
  prepMinutes: number;
  servings: number;
  imageUrl: string | null;
  ingredients: string[];
  instructions: string;
  isPublic: boolean;
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

export type MetabolicSex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very-active' | 'extra-active';
export type NutritionGoal = 'lose' | 'maintain' | 'gain';

export interface NutritionProfileInput {
  birthYear: number;
  metabolicSex: MetabolicSex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  nutritionGoal: NutritionGoal;
}

export interface NutritionProfile extends NutritionProfileInput {
  userId: string;
  onboardingCompleted: boolean;
  goals: NutritionGoals;
}
