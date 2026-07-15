import NutritionProfileForm from '../components/NutritionProfileForm';
import { useMeals } from '../store/MealContext';

export default function SettingsPage() {
  const { profile, updateProfile } = useMeals();
  return <div className="mx-auto max-w-3xl"><p className="font-semibold text-leaf-700">Preferências</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Definições</h1><p className="mt-2 text-stone-400">Atualiza os teus dados, recalcula o plano ou define objetivos manualmente.</p><section className="card mt-8 p-7"><NutritionProfileForm initialProfile={profile} initialGoals={profile.goals} submitLabel="Guardar alterações" onSave={updateProfile} /></section></div>;
}
