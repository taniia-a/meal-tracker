const keyFor = (userId: string) => `meal-tracker-shopping-entry-ids-${userId}`;
const recipeKeyFor = (userId: string) => `meal-tracker-shopping-recipes-${userId}`;

export interface ShoppingRecipe {
  recipeId: string;
  portions: number;
}

export function getShoppingEntryIds(userId: string): string[] {
  try { return JSON.parse(localStorage.getItem(keyFor(userId)) ?? '[]') as string[]; } catch { return []; }
}

export function saveShoppingEntryIds(userId: string, entryIds: string[]) {
  localStorage.setItem(keyFor(userId), JSON.stringify([...new Set(entryIds)]));
}

export function addShoppingEntryIds(userId: string, entryIds: string[]) {
  saveShoppingEntryIds(userId, [...getShoppingEntryIds(userId), ...entryIds]);
}

export function getShoppingRecipes(userId: string): ShoppingRecipe[] {
  try {
    const items = JSON.parse(localStorage.getItem(recipeKeyFor(userId)) ?? '[]') as ShoppingRecipe[];
    return items.filter((item) => item && typeof item.recipeId === 'string' && Number.isFinite(item.portions) && item.portions > 0);
  } catch { return []; }
}

export function saveShoppingRecipes(userId: string, recipes: ShoppingRecipe[]) {
  localStorage.setItem(recipeKeyFor(userId), JSON.stringify(recipes));
}

export function addShoppingRecipe(userId: string, recipeId: string, portions: number) {
  const recipes = getShoppingRecipes(userId);
  const existing = recipes.find((item) => item.recipeId === recipeId);
  if (existing) existing.portions += portions;
  else recipes.push({ recipeId, portions });
  saveShoppingRecipes(userId, recipes);
}
