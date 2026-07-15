import { Loader2 } from 'lucide-react';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { demoRecipes } from '../data/recipes';
import { neonClient } from '../lib/auth';
import OnboardingPage from '../pages/OnboardingPage';
import { MealEntry, MealType, NutritionGoals, NutritionProfile, NutritionProfileInput, Recipe } from '../types';

interface MealContextValue {
  recipes: Recipe[];
  entries: MealEntry[];
  goals: NutritionGoals;
  profile: NutritionProfile;
  updateProfile: (profile: NutritionProfileInput, goals: NutritionGoals) => Promise<void>;
  addMeal: (recipe: Recipe, mealType: MealType, portions: number, date?: string) => void;
  removeMeal: (id: string) => void;
}

const MealContext = createContext<MealContextValue | null>(null);
const today = () => new Date().toISOString().slice(0, 10);

const defaultGoals: NutritionGoals = { calories: 2000, protein: 130, carbs: 230, fat: 65 };

export function MealProvider({ children, userId }: { children: ReactNode; userId: string }) {
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

  const addMeal = (recipe: Recipe, mealType: MealType, portions: number, date = today()) => {
    const scale = (value: number) => Math.round(value * portions * 10) / 10;
    setEntries((current) => [...current, {
      id: crypto.randomUUID(), recipeId: recipe.id, recipeName: recipe.name, date, mealType, portions,
      calories: scale(recipe.calories), protein: scale(recipe.protein),
      carbs: scale(recipe.carbs), fat: scale(recipe.fat)
    }]);
  };

  const removeMeal = (id: string) => setEntries((current) => current.filter((entry) => entry.id !== id));

  if (isProfileLoading) {
    return <div className="grid min-h-screen place-items-center bg-cream"><div className="text-center"><Loader2 className="mx-auto animate-spin text-leaf-500" size={38} /><p className="mt-4 text-sm font-semibold text-stone-400">A preparar o teu perfil...</p></div></div>;
  }

  if (profileError) {
    return <div className="grid min-h-screen place-items-center bg-cream p-5"><div className="card max-w-lg p-8 text-center"><h1 className="text-2xl font-extrabold">Não foi possível carregar o perfil</h1><p className="mt-3 text-sm text-stone-400">{profileError}</p><button className="mt-6 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white" onClick={() => window.location.reload()}>Tentar novamente</button></div></div>;
  }

  if (!profile?.onboardingCompleted) return <OnboardingPage onComplete={updateProfile} />;

  return (
    <MealContext.Provider value={{ recipes: demoRecipes, entries, goals, profile, updateProfile, addMeal, removeMeal }}>
      {children}
    </MealContext.Provider>
  );
}

export function useMeals() {
  const context = useContext(MealContext);
  if (!context) throw new Error('useMeals deve ser usado dentro de MealProvider');
  return context;
}
