import { Loader2 } from 'lucide-react';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { neonClient } from '../lib/auth';
import OnboardingPage from '../pages/OnboardingPage';
import { MealEntry, MealType, NutritionGoals, NutritionProfile, NutritionProfileInput, Recipe, RecipeInput } from '../types';

interface MealContextValue {
  recipes: Recipe[];
  isRecipesLoading: boolean;
  entries: MealEntry[];
  goals: NutritionGoals;
  profile: NutritionProfile;
  updateProfile: (profile: NutritionProfileInput, goals: NutritionGoals) => Promise<void>;
  saveRecipe: (recipe: RecipeInput, recipeId?: string) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  addMeal: (recipe: Recipe, mealType: MealType, portions: number, date?: string) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
}

const MealContext = createContext<MealContextValue | null>(null);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const defaultGoals: NutritionGoals = { calories: 2000, protein: 130, carbs: 230, fat: 65 };
const recipeColumns = 'id, owner_user_id, is_public, image_url, name, category, instructions, prep_minutes, servings, calories, protein, carbs, fat';

export function MealProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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
        .select('user_id, calorie_goal, protein_goal, carbs_goal, fat_goal, birth_year, metabolic_sex, height_cm, weight_kg, activity_level, nutrition_goal, onboarding_completed')
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
        ? await neonClient.from('recipe_ingredients').select('recipe_id, name, position').in('recipe_id', ids).order('position')
        : { data: [], error: null };
      if (!isActive) return;
      if (ingredientResult.error) { setProfileError(ingredientResult.error.message); setIsRecipesLoading(false); return; }
      const loadedRecipes = (recipeRows ?? []).map((row) => mapRecipe(row, (ingredientResult.data ?? []).filter((item) => item.recipe_id === row.id).map((item) => item.name)));
      setRecipes(loadedRecipes);
      const entryResult = await neonClient.from('meal_entries').select('id, recipe_id, meal_date, meal_type, portions').order('created_at', { ascending: true });
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

  const updateProfile = async (input: NutritionProfileInput, nextGoals: NutritionGoals) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { data, error } = await neonClient.from('profiles').update({
      birth_year: input.birthYear,
      metabolic_sex: input.metabolicSex,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      activity_level: input.activityLevel,
      nutrition_goal: input.nutritionGoal,
      calorie_goal: nextGoals.calories,
      protein_goal: nextGoals.protein,
      carbs_goal: nextGoals.carbs,
      fat_goal: nextGoals.fat,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
      .eq('user_id', userId)
      .select('user_id, calorie_goal, protein_goal, carbs_goal, fat_goal, birth_year, metabolic_sex, height_cm, weight_kg, activity_level, nutrition_goal, onboarding_completed')
      .single();

    if (error || !data) throw new Error(error?.message || 'A base de dados não confirmou as alterações.');

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
      onboardingCompleted: Boolean(data.onboarding_completed),
      goals: savedGoals,
    });
  };

  const saveRecipe = async (input: RecipeInput, recipeId?: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const values = {
      owner_user_id: userId, name: input.name,
      category: input.category, instructions: input.instructions, prep_minutes: input.prepMinutes,
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
    const ingredients = input.ingredients.filter((item) => item.trim()).map((name, position) => ({ recipe_id: id, name: name.trim(), position }));
    if (ingredients.length) {
      const inserted = await neonClient.from('recipe_ingredients').insert(ingredients);
      if (inserted.error) throw new Error(inserted.error.message);
    }
    const saved = mapRecipe(result.data, ingredients.map((item) => item.name));
    setRecipes((current) => recipeId ? current.map((item) => item.id === id ? saved : item) : [saved, ...current]);
  };

  const deleteRecipe = async (recipeId: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { error } = await neonClient.from('recipes').delete().eq('id', recipeId);
    if (error) throw new Error(error.message);
    setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
  };

  const addMeal = async (recipe: Recipe, mealType: MealType, portions: number, date = today()) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { data, error } = await neonClient.from('meal_entries').insert({
      user_id: userId, recipe_id: recipe.id, meal_date: date, meal_type: mealType, portions,
    }).select('id, recipe_id, meal_date, meal_type, portions').single();
    if (error || !data) throw new Error(error?.message || 'A base de dados não confirmou o registo da refeição.');
    setEntries((current) => [...current, mapMealEntry(data, recipe)]);
  };

  const removeMeal = async (id: string) => {
    if (!neonClient) throw new Error('O cliente Neon não está configurado.');
    const { error } = await neonClient.from('meal_entries').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  if (isProfileLoading) {
    return <div className="grid min-h-screen place-items-center bg-cream"><div className="text-center"><Loader2 className="mx-auto animate-spin text-leaf-500" size={38} /><p className="mt-4 text-sm font-semibold text-stone-400">A preparar o teu perfil...</p></div></div>;
  }

  if (profileError) {
    return <div className="grid min-h-screen place-items-center bg-cream p-5"><div className="card max-w-lg p-8 text-center"><h1 className="text-2xl font-extrabold">Não foi possível carregar o perfil</h1><p className="mt-3 text-sm text-stone-400">{profileError}</p><button className="mt-6 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white" onClick={() => window.location.reload()}>Tentar novamente</button></div></div>;
  }

  if (!profile?.onboardingCompleted) return <OnboardingPage onComplete={updateProfile} />;

  return (
    <MealContext.Provider value={{ recipes, isRecipesLoading, entries, goals, profile, updateProfile, saveRecipe, deleteRecipe, addMeal, removeMeal }}>
      {children}
    </MealContext.Provider>
  );
}

interface RecipeRow {
  id: string; name: string; category: string; prep_minutes: number | string;
  servings: number | string; calories: number | string; protein: number | string;
  carbs: number | string; fat: number | string; instructions: string;
  owner_user_id: string; is_public: boolean; image_url: string | null;
}

function mapRecipe(row: RecipeRow, ingredients: string[]): Recipe {
  return {
    id: row.id, name: row.name, category: row.category,
    prepMinutes: Number(row.prep_minutes), servings: Number(row.servings),
    imageUrl: row.image_url,
    calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat),
    instructions: row.instructions, ownerId: row.owner_user_id, isPublic: Boolean(row.is_public), ingredients,
    imageColor: 'from-purple-500/40 to-fuchsia-500/30',
  };
}

interface MealEntryRow {
  id: string; recipe_id: string; meal_date: string; meal_type: MealType; portions: number | string;
}

function mapMealEntry(row: MealEntryRow, recipe: Recipe): MealEntry {
  const portions = Number(row.portions);
  const scale = (value: number) => Math.round(value * portions * 10) / 10;
  return {
    id: row.id, recipeId: row.recipe_id, recipeName: recipe.name, date: row.meal_date,
    mealType: row.meal_type, portions, calories: scale(recipe.calories),
    protein: scale(recipe.protein), carbs: scale(recipe.carbs), fat: scale(recipe.fat),
  };
}

export function useMeals() {
  const context = useContext(MealContext);
  if (!context) throw new Error('useMeals deve ser usado dentro de MealProvider');
  return context;
}
