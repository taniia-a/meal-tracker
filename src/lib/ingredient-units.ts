const recipeUnits = ['g', 'kg', 'ml', 'L', 'unidade', 'q.b.'];
const pantryUnits = ['g', 'kg', 'ml', 'L', 'unidade'];

function normalise(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function allowedIngredientUnits(name: string, includeQb = true) {
  const ingredient = normalise(name.trim());
  const fallback = includeQb ? recipeUnits : pantryUnits;
  if (!ingredient) return fallback;

  if (/(iogurte|yogurt|queijo|cheese|aveia|oat|farinha|flour|arroz|rice|massa|pasta|frango|chicken|peru|turkey|carne|beef|peixe|fish|atum|tuna|salmao|salmon|tofu|proteina|protein|cacau|cocoa)/.test(ingredient)) return ['g'];
  if (/(^|\s)(ovo|ovos|egg|eggs)(\s|$)/.test(ingredient)) return ['unidade'];
  if (/(leite|milk|bebida vegetal|vegetable drink|cafe|coffee|agua|water|azeite|oil|vinagre|vinegar|caldo|broth)/.test(ingredient)) return ['ml', 'L'];

  return fallback;
}
