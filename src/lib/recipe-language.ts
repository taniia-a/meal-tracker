import { Recipe } from '../types';

export const recipeName = (recipe: Recipe, language: string) => language.startsWith('en') && recipe.nameEn.trim() ? recipe.nameEn : recipe.name;
export const recipeInstructions = (recipe: Recipe, language: string) => language.startsWith('en') && recipe.instructionsEn.trim() ? recipe.instructionsEn : recipe.instructions;
export const recipeIngredients = (recipe: Recipe, language: string) => recipe.ingredients.map((item, index) => {
  const name = language.startsWith('en') && recipe.ingredientsEn[index]?.trim() ? recipe.ingredientsEn[index].trim() : item;
  const quantity = recipe.ingredientQuantities[index];
  const unit = recipe.ingredientUnits[index]?.trim();
  const label = !unit ? name : quantity === null || quantity === undefined ? unit === 'q.b.' ? (language.startsWith('en') ? `${unit} ${name}` : `${unit} de ${name}`) : name : language.startsWith('en') ? `${quantity} ${unit} ${name}` : `${quantity} ${unit} de ${name}`;
  return recipe.ingredientOptional[index] ? `${label} (${language.startsWith('en') ? 'optional' : 'opcional'})` : label;
});
