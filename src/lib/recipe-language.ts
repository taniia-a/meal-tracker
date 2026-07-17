import { Recipe } from '../types';

export const recipeName = (recipe: Recipe, language: string) => language.startsWith('en') && recipe.nameEn.trim() ? recipe.nameEn : recipe.name;
export const recipeInstructions = (recipe: Recipe, language: string) => language.startsWith('en') && recipe.instructionsEn.trim() ? recipe.instructionsEn : recipe.instructions;
export const recipeIngredients = (recipe: Recipe, language: string) => language.startsWith('en') && recipe.ingredientsEn.some((item) => item.trim())
  ? recipe.ingredients.map((item, index) => recipe.ingredientsEn[index]?.trim() || item)
  : recipe.ingredients;
