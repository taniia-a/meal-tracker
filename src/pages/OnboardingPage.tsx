import { ChefHat } from 'lucide-react';
import NutritionProfileForm from '../components/NutritionProfileForm';
import { GoalMode, NutritionGoals, NutritionProfileInput } from '../types';
import { useTranslation } from 'react-i18next';

export default function OnboardingPage({ onComplete }: { onComplete: (profile: NutritionProfileInput, goals: NutritionGoals, goalMode: GoalMode) => Promise<void> }) {
  const { t } = useTranslation();
  return <main className="min-h-screen bg-cream px-5 py-10"><section className="card mx-auto max-w-3xl p-7 sm:p-10"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-600 text-white"><ChefHat /></div><div><p className="font-display text-xl font-extrabold">{t('Vamos personalizar o teu plano')}</p><p className="text-sm text-stone-400">{t('Responde a algumas perguntas para estimarmos os teus objetivos.')}</p></div></div><div className="mt-8"><NutritionProfileForm submitLabel={t('Criar o meu plano')} onSave={onComplete} /></div></section></main>;
}
