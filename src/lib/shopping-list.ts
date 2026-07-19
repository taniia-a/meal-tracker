import { neonClient } from './auth';

const keyFor = (userId: string) => `meal-tracker-shopping-entry-ids-${userId}`;
const recipeKeyFor = (userId: string) => `meal-tracker-shopping-recipes-${userId}`;
const portionsKeyFor = (userId: string) => `meal-tracker-shopping-recipe-portions-${userId}`;
const customItemsKeyFor = (userId: string) => `meal-tracker-shopping-custom-items-${userId}`;
const checkedKeyFor = (userId: string) => `meal-tracker-shopping-checked-${userId}`;

export interface ShoppingRecipe {
  recipeId: string;
  portions: number;
}

export interface ShoppingListData {
  entryIds: string[];
  recipes: ShoppingRecipe[];
  portions: Record<string, number>;
  customItems: string[];
  checked: string[];
}

const readJson = <T>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; } catch { return fallback; }
};

export function getShoppingListData(userId: string): ShoppingListData {
  return {
    entryIds: getShoppingEntryIds(userId),
    recipes: getShoppingRecipes(userId),
    portions: getShoppingRecipePortions(userId),
    customItems: getShoppingCustomItems(userId),
    checked: readJson<string[]>(checkedKeyFor(userId), []),
  };
}

export function hydrateShoppingList(userId: string, data: ShoppingListData) {
  localStorage.setItem(keyFor(userId), JSON.stringify(data.entryIds));
  localStorage.setItem(recipeKeyFor(userId), JSON.stringify(data.recipes));
  localStorage.setItem(portionsKeyFor(userId), JSON.stringify(data.portions));
  localStorage.setItem(customItemsKeyFor(userId), JSON.stringify(data.customItems));
  localStorage.setItem(checkedKeyFor(userId), JSON.stringify(data.checked));
}

export async function loadShoppingList(userId: string): Promise<ShoppingListData | null> {
  if (!neonClient) return null;
  const { data, error } = await neonClient.from('shopping_lists').select('entry_ids, recipes, portion_overrides, custom_items, checked_items').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    entryIds: Array.isArray(data.entry_ids) ? data.entry_ids.filter((item): item is string => typeof item === 'string') : [],
    recipes: Array.isArray(data.recipes) ? data.recipes.filter((item): item is ShoppingRecipe => Boolean(item) && typeof item === 'object' && typeof (item as ShoppingRecipe).recipeId === 'string' && Number.isFinite((item as ShoppingRecipe).portions) && (item as ShoppingRecipe).portions > 0) : [],
    portions: data.portion_overrides && typeof data.portion_overrides === 'object' && !Array.isArray(data.portion_overrides) ? Object.fromEntries(Object.entries(data.portion_overrides as Record<string, unknown>).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0).map(([key, value]) => [key, value as number])) : {},
    customItems: Array.isArray(data.custom_items) ? data.custom_items.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [],
    checked: Array.isArray(data.checked_items) ? data.checked_items.filter((item): item is string => typeof item === 'string') : [],
  };
}

export async function syncShoppingList(userId: string) {
  if (!neonClient) return;
  const list = getShoppingListData(userId);
  const { error } = await neonClient.from('shopping_lists').upsert({ user_id: userId, entry_ids: list.entryIds, recipes: list.recipes, portion_overrides: list.portions, custom_items: list.customItems, checked_items: list.checked, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export function getShoppingEntryIds(userId: string): string[] {
  try { return JSON.parse(localStorage.getItem(keyFor(userId)) ?? '[]') as string[]; } catch { return []; }
}

export function saveShoppingEntryIds(userId: string, entryIds: string[]) {
  localStorage.setItem(keyFor(userId), JSON.stringify([...new Set(entryIds)]));
  void syncShoppingList(userId);
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
  void syncShoppingList(userId);
}

export function addShoppingRecipe(userId: string, recipeId: string, portions: number) {
  const recipes = getShoppingRecipes(userId);
  const existing = recipes.find((item) => item.recipeId === recipeId);
  if (existing) existing.portions += portions;
  else recipes.push({ recipeId, portions });
  saveShoppingRecipes(userId, recipes);
}

export function getShoppingRecipePortions(userId: string): Record<string, number> {
  try {
    const values = JSON.parse(localStorage.getItem(portionsKeyFor(userId)) ?? '{}') as Record<string, number>;
    return Object.fromEntries(Object.entries(values).filter(([, portions]) => Number.isFinite(portions) && portions > 0));
  } catch { return {}; }
}

export function saveShoppingRecipePortions(userId: string, portions: Record<string, number>) {
  localStorage.setItem(portionsKeyFor(userId), JSON.stringify(portions));
  void syncShoppingList(userId);
}

export function getShoppingCustomItems(userId: string): string[] {
  try {
    const items = JSON.parse(localStorage.getItem(customItemsKeyFor(userId)) ?? '[]') as unknown;
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch { return []; }
}

export function saveShoppingCustomItems(userId: string, items: string[]) {
  localStorage.setItem(customItemsKeyFor(userId), JSON.stringify([...new Set(items.map((item) => item.trim()).filter(Boolean))]));
  void syncShoppingList(userId);
}

export function saveShoppingCheckedItems(userId: string, checked: string[]) {
  localStorage.setItem(checkedKeyFor(userId), JSON.stringify([...new Set(checked)]));
  void syncShoppingList(userId);
}
