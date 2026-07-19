import NutritionProfileForm from '../components/NutritionProfileForm';
import { useMeals } from '../store/MealContext';
import { useTranslation } from 'react-i18next';
import NumberInput from '../components/NumberInput';
import { FormEvent, useEffect, useState } from 'react';

export default function SettingsPage() {
  const { profile, updateProfile, updateWaterGoal, updateDislikedIngredients } = useMeals();
  const { t } = useTranslation();
  const [waterGoal, setWaterGoal] = useState(profile.waterGoalMl);
  const [savingWater, setSavingWater] = useState(false);
  const [waterFeedback, setWaterFeedback] = useState('');
  const [dislikedIngredients, setDislikedIngredients] = useState(profile.dislikedIngredients.join(', '));
  const [savingDisliked, setSavingDisliked] = useState(false);
  const [dislikedFeedback, setDislikedFeedback] = useState('');

  useEffect(() => setWaterGoal(profile.waterGoalMl), [profile.waterGoalMl]);
  useEffect(() => setDislikedIngredients(profile.dislikedIngredients.join(', ')), [profile.dislikedIngredients]);

  const saveWaterGoal = async (event: FormEvent) => {
    event.preventDefault();
    setSavingWater(true);
    setWaterFeedback('');
    try {
      await updateWaterGoal(waterGoal);
      setWaterFeedback(t('Objetivo de água guardado.'));
    } catch (error) {
      setWaterFeedback(error instanceof Error ? error.message : t('Não foi possível guardar o objetivo de água.'));
    } finally {
      setSavingWater(false);
    }
  };
  const saveDislikedIngredients = async (event: FormEvent) => {
    event.preventDefault();
    setSavingDisliked(true); setDislikedFeedback('');
    try {
      await updateDislikedIngredients(dislikedIngredients.split(',').map((item) => item.trim()));
      setDislikedFeedback(t('Ingredientes a evitar guardados.'));
    } catch (error) {
      setDislikedFeedback(error instanceof Error ? error.message : t('Não foi possível guardar os ingredientes a evitar.'));
    } finally { setSavingDisliked(false); }
  };

  return <div className="mx-auto max-w-3xl"><p className="font-semibold text-leaf-700">{t('Preferências')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Definições')}</h1><p className="mt-2 text-stone-400">{t('Atualiza os teus dados, recalcula o plano ou define objetivos manualmente.')}</p><section className="card mt-8 p-7"><NutritionProfileForm initialProfile={profile} initialGoals={profile.goals} initialGoalMode={profile.goalMode} submitLabel={t('Guardar alterações')} onSave={updateProfile} /></section><section className="card mt-6 p-7"><h2 className="text-xl font-bold">{t('Objetivo diário de água')}</h2><p className="mt-1 text-sm text-stone-400">{t('Define a quantidade de água que queres acompanhar todos os dias.')}</p><form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={saveWaterGoal}><label className="text-sm font-semibold sm:w-56">{t('Água por dia (ml)')}<NumberInput className="input mt-2" min="250" max="10000" step="50" required value={waterGoal} onValueChange={setWaterGoal} /></label><button disabled={savingWater} className="rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60">{savingWater ? t('A guardar...') : t('Guardar objetivo de água')}</button></form>{waterFeedback && <p role="status" className="mt-3 text-sm font-semibold text-leaf-600">{waterFeedback}</p>}</section><section className="card mt-6 p-7"><h2 className="text-xl font-bold">{t('Ingredientes a evitar')}</h2><p className="mt-1 text-sm text-stone-400">{t('Não serão sugeridas receitas que incluam estes ingredientes.')}</p><form className="mt-5" onSubmit={saveDislikedIngredients}><label className="block text-sm font-semibold">{t('Ingredientes separados por vírgulas')}<textarea className="input mt-2 min-h-24 resize-y" value={dislikedIngredients} onChange={(event) => setDislikedIngredients(event.target.value)} placeholder={t('Ex.: cogumelos, atum, coentros')} /></label><button disabled={savingDisliked} className="mt-4 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60">{savingDisliked ? t('A guardar...') : t('Guardar ingredientes')}</button></form>{dislikedFeedback && <p role="status" className="mt-3 text-sm font-semibold text-leaf-600">{dislikedFeedback}</p>}</section></div>;
}
