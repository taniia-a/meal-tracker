import { NutritionGoals, NutritionProfileInput } from '../types';

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  'very-active': 1.725,
  'extra-active': 1.9,
} as const;

export function calculateNutrition(input: NutritionProfileInput): NutritionGoals {
  const age = new Date().getFullYear() - input.birthYear;
  const sexAdjustment = input.metabolicSex === 'male' ? 5 : -161;
  const restingCalories = (10 * input.weightKg) + (6.25 * input.heightCm) - (5 * age) + sexAdjustment;
  const maintenanceCalories = restingCalories * activityMultipliers[input.activityLevel];
  const goalMultiplier = input.nutritionGoal === 'lose' ? 0.85 : input.nutritionGoal === 'gain' ? 1.1 : 1;
  const calories = roundToTen(Math.max(1200, maintenanceCalories * goalMultiplier));

  return calculateMacrosForCalories(input, calories);
}

export function calculateMacrosForCalories(input: NutritionProfileInput, calories: number): NutritionGoals {
  // Aim for 1.6 g/kg while keeping all macros within general adult AMDR ranges.
  const desiredProtein = input.weightKg * 1.6;
  const maxProteinForBalancedCarbs = calories * 0.3 / 4;
  const protein = Math.round(Math.min(desiredProtein, maxProteinForBalancedCarbs));
  const fat = Math.round(calories * 0.25 / 9);
  const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

  return { calories, protein, carbs, fat };
}

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}
