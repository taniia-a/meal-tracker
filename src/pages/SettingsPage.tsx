import NutritionProfileForm from '../components/NutritionProfileForm';
import { useMeals } from '../store/MealContext';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { profile, updateProfile } = useMeals();
  const { t } = useTranslation();
  return <div className="mx-auto max-w-3xl"><p className="font-semibold text-leaf-700">{t('Preferências')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Definições')}</h1><p className="mt-2 text-stone-400">{t('Atualiza os teus dados, recalcula o plano ou define objetivos manualmente.')}</p><section className="card mt-8 p-7"><NutritionProfileForm initialProfile={profile} initialGoals={profile.goals} submitLabel={t('Guardar alterações')} onSave={updateProfile} /></section></div>;
}
