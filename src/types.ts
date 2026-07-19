export type MealType = "Pequeno-almoço" | "Almoço" | "Lanche" | "Jantar";
export type RecipeTaste = "Doce" | "Salgada";

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe extends Macros {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  taste: RecipeTaste;
  prepMinutes: number;
  servings: number;
  imageUrl: string | null;
  imageColor: string;
  ingredients: string[];
  ingredientsEn: string[];
  ingredientQuantities: Array<number | null>;
  ingredientUnits: string[];
  ingredientOptional: boolean[];
  instructions: string;
  instructionsEn: string;
  notes: string;
  notesEn: string;
  ownerId: string;
  isPublic: boolean;
}

export interface RecipeInput extends Macros {
  name: string;
  nameEn: string;
  category: string;
  taste: RecipeTaste;
  prepMinutes: number;
  servings: number;
  imageUrl: string | null;
  ingredients: string[];
  ingredientsEn: string[];
  ingredientQuantities: Array<number | null>;
  ingredientUnits: string[];
  ingredientOptional: boolean[];
  instructions: string;
  instructionsEn: string;
  notes: string;
  notesEn: string;
  isPublic: boolean;
}

export interface RecipeReview {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealEntry extends Macros {
  id: string;
  recipeId: string | null;
  recipeName: string;
  recipeNameEn: string;
  date: string;
  mealType: MealType;
  portions: number;
  isConsumed: boolean;
  isManual: boolean;
}

export interface ManualMealInput extends Macros {
  name: string;
  date: string;
  mealType: MealType;
}

export interface WaterEntry {
  id: string;
  date: string;
  amountMl: number;
  createdAt: string;
}

export type NutritionGoals = Macros;

export type MetabolicSex = "female" | "male";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very-active"
  | "extra-active";
export type NutritionGoal = "lose" | "maintain" | "gain";
export type GoalMode = "calculated" | "manual";

export interface NutritionProfileInput {
  birthYear: number;
  metabolicSex: MetabolicSex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  nutritionGoal: NutritionGoal;
  dislikedIngredients: string[];
}

export interface NutritionProfile extends NutritionProfileInput {
  userId: string;
  onboardingCompleted: boolean;
  goalMode: GoalMode;
  goals: NutritionGoals;
  waterGoalMl: number;
  dislikedIngredients: string[];
}
