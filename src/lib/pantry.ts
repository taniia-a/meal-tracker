import { PantryItem, Recipe } from '../types';
import { nutritionDay } from './nutrition-day';

const normalise = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function pantryRecipeMatch(recipe: Recipe, pantryItems: PantryItem[]) {
  const today = nutritionDay();
  const inRecipe = [...recipe.ingredients, ...recipe.ingredientsEn].map(normalise);
  const matching = pantryItems.filter((item) => {
    const name = normalise(item.name);
    return name && inRecipe.some((ingredient) => ingredient.includes(name) || name.includes(ingredient));
  });
  const expiring = matching.filter((item) => item.expiresOn && item.expiresOn >= today && item.expiresOn <= (() => { const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + 7); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; })());
  return { matching, expiring, score: matching.length * 0.03 + expiring.length * 0.18 };
}
