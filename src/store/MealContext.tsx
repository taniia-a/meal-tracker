import { Loader2 } from 'lucide-react';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { neonClient } from '../lib/auth';
import OnboardingPage from '../pages/OnboardingPage';
import { GoalMode, MealEntry, MealType, NutritionGoals, NutritionProfile, NutritionProfileInput, Recipe, RecipeInput } from '../types';
import { calculateNutrition } from '../lib/nutrition';
import { useTranslation } from 'react-i18next';

interface MealContextValue {
  recipes: Recipe[];
  favoriteRecipeIds: string[];
  isRecipesLoading: boolean;
  entries: MealEntry[];
  goals: NutritionGoals;
  profile: NutritionProfile;
  updateProfile: (profile: NutritionProfileInput, goals: NutritionGoals, goalMode: GoalMode) => Promise<void>;
  syncProgressWeight: (weightKg: number) => Promise<void>;
  saveRecipe: (recipe: RecipeInput, recipeId?: string) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  addMeal: (recipe: Recipe, mealType: MealType, portions: number, date: string) => Promise<void>;
  updateMeal: (entryId: string, recipe: Recipe, mealType: MealType, portions: number, date: string) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
}

const MealContext = createContext<MealContextValue | null>(null);
const defaultGoals: NutritionGoals = { calories: 2000, protein: 130, carbs: 230, fat: 65 };
const localToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const recipeColumns = 'id, owner_user_id, is_public, image_url, name, name_en, category, instructions, instructions_en, notes, notes_en, prep_minutes, servings, calories, protein, carbs, fat';

export function MealProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>([]);
  const [isRecipesLoading, setIsRecipesLoading] = useState(true);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(defaultGoals);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      if (!neonClient) return;

      setIsProfileLoading(true);
      setProfileError('');

      const { data, error } = await neonClient
        .from('profiles')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
        .select('user_id, calorie_goal, protein_goal, carbs_goal, fat_goal, birth_year, metabolic_sex, height_cm, weight_kg, activity_level, nutrition_goal, goal_mode, onboarding_completed')
        .single();

      if (!isActive) return;

      if (error || !data) {
        setProfileError(error?.message || 'Não foi possível carregar o perfil.');
      } else {
        const loadedGoals = {
          calories: Number(data.calorie_goal),
          protein: Number(data.protein_goal),
          carbs: Number(data.carbs_goal),
          fat: Number(data.fat_goal),
        };
        setGoals(loadedGoals);
        setProfile({
          userId: data.user_id,
          birthYear: Number(data.birth_year || new Date().getFullYear() - 30),
          metabolicSex: data.metabolic_sex || 'female',
          heightCm: Number(data.height_cm || 165),
          weightKg: Number(data.weight_kg || 65),
          activityLevel: data.activity_level || 'moderate',
          nutritionGoal: data.nutrition_goal || 'maintain',
          goalMode: data.goal_mode === 'manual' ? 'manual' : 'calculated',
          onboardingCompleted: Boolean(data.onboarding_completed),
          goals: loadedGoals,
        });
      }

      setIsProfileLoading(false);
    }

    loadProfile();
    return () => { isActive = false; };
  }, [userId]);

  useEffect(() => {
    let isActive = true;
    async function loadRecipes() {
      if (!neonClient) return;
      setIsRecipesLoading(true);
      const { data: recipeRows, error } = await neonClient.from('recipes').select(recipeColumns).order('created_at', { ascending: false });
      if (error) { setProfileError(error.message); setIsRecipesLoading(false); return; }
      const ids = (recipeRows ?? []).map((row) => row.id);
      const ingredientResult = ids.length
        ? await neonClient.from('recipe_ingredients').select('recipe_id, name, name_en, quantity, unit, is_optional, position').in('recipe_id', ids).order('position')
        : { data: [], error: null };
      if (!isActive) return;
      if (ingredientResult.error) { setProfileError(ingredientResult.error.message); setIsRecipesLoading(false); return; }
      const favoritesResult = await neonClient.from('recipe_favorites').select('recipe_id').eq('user_id', userId);
      if (!isActive) return;
      if (favoritesResult.error) { setProfileError(favoritesResult.error.message); setIsRecipesLoading(false); return; }
      setFavoriteRecipeIds((favoritesResult.data ?? []).map((item) => item.recipe_id));
      const loadedRecipes = (recipeRows ?? []).map((row) => mapRecipe(row, (ingredientResult.data ?? []).filter((item) => item.recipe_id === row.id)));
      setRecipes(loadedRecipes);
      const entryResult = await neonClient.from('meal_entries').select('id, recipe_id, meal_date, meal_type, portions, is_consumed').order('created_at', { ascending: true });
      if (!isActive) return;
      if (entryResult.error) { setProfileError(entryResult.error.message); setIsRecipesLoading(false); return; }
      setEntries((entryResult.data ?? []).flatMap((row) => {
        const recipe = loadedRecipes.find((item) => item.id === row.recipe_id);
        return recipe ? [mapMealEntry(row, recipe)] : [];
      }));
      setIsRecipesLoading(false);
    }
    loadRecipes();
    return () => { isActive = false; };
  }, [userId]);

  const updateProfile = async (input: NutritionProfileInput, nextGoals: NutritionGoals, goalMode: GoalMode) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { data, error } = await neonClient.from('profiles').update({
      birth_year: input.birthYear,
      metabolic_sex: input.metabolicSex,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      activity_level: input.activityLevel,
      nutrition_goal: input.nutritionGoal,
      goal_mode: goalMode,
      calorie_goal: nextGoals.calories,
      protein_goal: nextGoals.protein,
      carbs_goal: nextGoals.carbs,
      fat_goal: nextGoals.fat,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
      .eq('user_id', userId)
      .select('user_id, calorie_goal, protein_goal, carbs_goal, fat_goal, birth_year, metabolic_sex, height_cm, weight_kg, activity_level, nutrition_goal, goal_mode, onboarding_completed')
      .single();

    if (error || !data) throw new Error(error?.message || 'A base de dados não confirmou as alterações.');

    const existingWeight = await neonClient.from('weight_entries').select('id').eq('user_id', userId).limit(1);
    if (existingWeight.error) throw new Error(existingWeight.error.message);
    if (!existingWeight.data?.length) {
      const date = new Date();
      const measuredOn = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const { error: weightError } = await neonClient.from('weight_entries').insert({ user_id: userId, measured_on: measuredOn, weight_kg: input.weightKg });
      if (weightError) throw new Error(weightError.message);
    }

    const savedGoals = {
      calories: Number(data.calorie_goal),
      protein: Number(data.protein_goal),
      carbs: Number(data.carbs_goal),
      fat: Number(data.fat_goal),
    };
    setGoals(savedGoals);
    setProfile({
      userId: data.user_id,
      birthYear: Number(data.birth_year),
      metabolicSex: data.metabolic_sex,
      heightCm: Number(data.height_cm),
      weightKg: Number(data.weight_kg),
      activityLevel: data.activity_level,
      nutritionGoal: data.nutrition_goal,
      goalMode: data.goal_mode === 'manual' ? 'manual' : 'calculated',
      onboardingCompleted: Boolean(data.onboarding_completed),
      goals: savedGoals,
    });
  };

  const syncProgressWeight = async (weightKg: number) => {
    if (!neonClient || !profile || profile.goalMode !== 'calculated') return;
    const goalsForWeight = calculateNutrition({ ...profile, weightKg });
    const { error } = await neonClient.from('profiles').update({ calorie_goal: goalsForWeight.calories, protein_goal: goalsForWeight.protein, carbs_goal: goalsForWeight.carbs, fat_goal: goalsForWeight.fat, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) throw new Error(error.message);
    setGoals(goalsForWeight);
    setProfile((current) => current ? { ...current, goals: goalsForWeight } : current);
  };

  const saveRecipe = async (input: RecipeInput, recipeId?: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const values = {
      owner_user_id: userId, name: input.name, name_en: input.nameEn || null,
      category: input.category, instructions: input.instructions, instructions_en: input.instructionsEn || null, notes: input.notes || null, notes_en: input.notesEn || null, prep_minutes: input.prepMinutes,
      servings: input.servings, calories: input.calories, protein: input.protein,
      carbs: input.carbs, fat: input.fat, image_url: input.imageUrl,
      is_public: input.isPublic, updated_at: new Date().toISOString(),
    };
    const result = recipeId
      ? await neonClient.from('recipes').update(values).eq('id', recipeId).select(recipeColumns).single()
      : await neonClient.from('recipes').insert(values).select(recipeColumns).single();
    if (result.error || !result.data) throw new Error(result.error?.message || 'Não foi possível guardar a receita.');
    const id = result.data.id;
    if (recipeId) {
      const removed = await neonClient.from('recipe_ingredients').delete().eq('recipe_id', id);
      if (removed.error) throw new Error(removed.error.message);
    }
    const ingredients = input.ingredients.map((name, index) => ({ name, nameEn: input.ingredientsEn[index] ?? '', quantity: input.ingredientQuantities[index] ?? null, unit: input.ingredientUnits[index] ?? '', isOptional: input.ingredientOptional[index] ?? false })).filter((item) => item.name.trim()).map((item, position) => ({ recipe_id: id, name: item.name.trim(), name_en: item.nameEn.trim() || null, quantity: item.quantity, unit: item.unit.trim() || null, is_optional: item.isOptional, position }));
    if (ingredients.length) {
      const inserted = await neonClient.from('recipe_ingredients').insert(ingredients);
      if (inserted.error) throw new Error(inserted.error.message);
    }
    const saved = mapRecipe(result.data, ingredients);
    setRecipes((current) => recipeId ? current.map((item) => item.id === id ? saved : item) : [saved, ...current]);
  };

  const deleteRecipe = async (recipeId: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { error } = await neonClient.from('recipes').delete().eq('id', recipeId);
    if (error) throw new Error(error.message);
    setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
    setFavoriteRecipeIds((current) => current.filter((id) => id !== recipeId));
  };

  const toggleFavorite = async (recipeId: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const isFavorite = favoriteRecipeIds.includes(recipeId);
    if (isFavorite) {
      const { error } = await neonClient.from('recipe_favorites').delete().eq('user_id', userId).eq('recipe_id', recipeId);
      if (error) throw new Error(error.message);
      setFavoriteRecipeIds((current) => current.filter((id) => id !== recipeId));
    } else {
      const { error } = await neonClient.from('recipe_favorites').insert({ user_id: userId, recipe_id: recipeId });
      if (error) throw new Error(error.message);
      setFavoriteRecipeIds((current) => [...current, recipeId]);
    }
  };

  const addMeal = async (recipe: Recipe, mealType: MealType, portions: number, date: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { data, error } = await neonClient.from('meal_entries').insert({
      user_id: userId, recipe_id: recipe.id, meal_date: date, meal_type: mealType, portions, is_consumed: date <= localToday(),
    }).select('id, recipe_id, meal_date, meal_type, portions, is_consumed').single();
    if (error || !data) throw new Error(error?.message || 'A base de dados não confirmou o registo da refeição.');
    setEntries((current) => [...current, mapMealEntry(data, recipe)]);
  };

  const updateMeal = async (entryId: string, recipe: Recipe, mealType: MealType, portions: number, date: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { data, error } = await neonClient.from('meal_entries').update({
      meal_date: date, meal_type: mealType, portions, is_consumed: date <= localToday(),
    }).eq('id', entryId).select('id, recipe_id, meal_date, meal_type, portions, is_consumed').single();
    if (error || !data) throw new Error(error?.message || 'A base de dados não confirmou as alterações.');
    const updated = mapMealEntry(data, recipe);
    setEntries((current) => current.map((entry) => entry.id === entryId ? updated : entry));
  };

  const removeMeal = async (id: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { error } = await neonClient.from('meal_entries').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  if (isProfileLoading) {
    return <div className="grid min-h-screen place-items-center bg-cream"><div className="text-center"><Loader2 className="mx-auto animate-spin text-leaf-500" size={38} /><p className="mt-4 text-sm font-semibold text-stone-400">{t('A preparar o teu perfil...')}</p></div></div>;
  }

  if (profileError) {
    return <div className="grid min-h-screen place-items-center bg-cream p-5"><div className="card max-w-lg p-8 text-center"><h1 className="text-2xl font-extrabold">{t('Não foi possível carregar o perfil')}</h1><p className="mt-3 text-sm text-stone-400">{profileError}</p><button className="mt-6 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white" onClick={() => window.location.reload()}>{t('Tentar novamente')}</button></div></div>;
  }

  if (!profile?.onboardingCompleted) return <OnboardingPage onComplete={updateProfile} />;

  return (
    <MealContext.Provider value={{ recipes, favoriteRecipeIds, isRecipesLoading, entries, goals, profile, updateProfile, syncProgressWeight, saveRecipe, deleteRecipe, toggleFavorite, addMeal, updateMeal, removeMeal }}>
      {children}
    </MealContext.Provider>
  );
}

interface RecipeRow {
  id: string; name: string; name_en: string | null; category: string; prep_minutes: number | string;
  servings: number | string; calories: number | string; protein: number | string;
  carbs: number | string; fat: number | string; instructions: string; instructions_en: string | null; notes: string | null; notes_en: string | null;
  owner_user_id: string; is_public: boolean; image_url: string | null;
}

interface IngredientRow { name: string; name_en: string | null; quantity: number | string | null; unit: string | null; is_optional: boolean | null; }

function mapRecipe(row: RecipeRow, ingredients: IngredientRow[]): Recipe {
  return {
    id: row.id, name: row.name, nameEn: row.name_en ?? '', category: row.category,
    prepMinutes: Number(row.prep_minutes), servings: Number(row.servings),
    imageUrl: row.image_url,
    calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat),
    instructions: row.instructions, instructionsEn: row.instructions_en ?? '', notes: row.notes ?? '', notesEn: row.notes_en ?? '', ownerId: row.owner_user_id, isPublic: Boolean(row.is_public),
    ingredients: ingredients.map((item) => item.name), ingredientsEn: ingredients.map((item) => item.name_en ?? ''),
    ingredientQuantities: ingredients.map((item) => item.quantity === null ? null : Number(item.quantity)), ingredientUnits: ingredients.map((item) => item.unit ?? 'g'), ingredientOptional: ingredients.map((item) => Boolean(item.is_optional)),
    imageColor: 'from-purple-500/40 to-fuchsia-500/30',
  };
}

interface MealEntryRow {
  id: string; recipe_id: string; meal_date: string; meal_type: MealType; portions: number | string; is_consumed: boolean;
}

function mapMealEntry(row: MealEntryRow, recipe: Recipe): MealEntry {
  const portions = Number(row.portions);
  const scale = (value: number) => Math.round(value * portions * 10) / 10;
  return {
    id: row.id, recipeId: row.recipe_id, recipeName: recipe.name, recipeNameEn: recipe.nameEn, date: row.meal_date,
    mealType: row.meal_type, portions, isConsumed: row.meal_date <= localToday(), calories: scale(recipe.calories),
    protein: scale(recipe.protein), carbs: scale(recipe.carbs), fat: scale(recipe.fat),
  };
}

export function useMeals() {
  const context = useContext(MealContext);
  if (!context) throw new Error('useMeals deve ser usado dentro de MealProvider');
  return context;
}
