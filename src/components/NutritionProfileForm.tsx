import { CheckCircle2, X, XCircle } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { calculateMacrosForCalories, calculateNutrition } from '../lib/nutrition';
import { NutritionGoals, NutritionProfileInput } from '../types';
import { useTranslation } from 'react-i18next';
import NumberInput from './NumberInput';

interface Props {
  initialProfile?: NutritionProfileInput;
  initialGoals?: NutritionGoals;
  submitLabel: string;
  onSave: (profile: NutritionProfileInput, goals: NutritionGoals) => Promise<void>;
}

const currentYear = new Date().getFullYear();
const defaults: NutritionProfileInput = {
  birthYear: currentYear - 30,
  metabolicSex: 'female',
  heightCm: 165,
  weightKg: 65,
  activityLevel: 'moderate',
  nutritionGoal: 'maintain',
};

export default function NutritionProfileForm({ initialProfile, initialGoals, submitLabel, onSave }: Props) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(initialProfile ?? defaults);
  const calculated = useMemo(() => calculateNutrition(profile), [profile]);
  const [manualGoals, setManualGoals] = useState(initialGoals ?? calculated);
  const [manual, setManual] = useState(() => Boolean(initialProfile && initialGoals && !goalsMatch(initialGoals, calculateNutrition(initialProfile))));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const goals = manual ? manualGoals : calculated;

  const updateManualCalories = (calories: number) => {
    setManualGoals(calculateMacrosForCalories(profile, calories));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSave(profile, goals);
      setFeedback({ type: 'success', message: t('Alterações guardadas com sucesso.') });
    }
    catch (reason) {
      setFeedback({ type: 'error', message: reason instanceof Error ? reason.message : t('Não foi possível guardar as alterações.') });
    }
    finally { setSaving(false); }
  };

  return <form onSubmit={submit} className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ano de nascimento"><NumberInput className="input mt-2" min={currentYear - 100} max={currentYear - 18} required value={profile.birthYear} onValueChange={(value) => setProfile({ ...profile, birthYear: value })} /></Field>
      <Field label="Fórmula metabólica"><select className="input mt-2" value={profile.metabolicSex} onChange={(e) => setProfile({ ...profile, metabolicSex: e.target.value as NutritionProfileInput['metabolicSex'] })}><option value="female">{t('Feminina')}</option><option value="male">{t('Masculina')}</option></select></Field>
      <Field label="Altura (cm)"><NumberInput className="input mt-2" min="120" max="230" required value={profile.heightCm} onValueChange={(value) => setProfile({ ...profile, heightCm: value })} /></Field>
      <Field label="Peso atual (kg)"><NumberInput className="input mt-2" min="35" max="300" step="0.1" required value={profile.weightKg} onValueChange={(value) => setProfile({ ...profile, weightKg: value })} /></Field>
      <Field label="Nível de atividade"><select className="input mt-2" value={profile.activityLevel} onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value as NutritionProfileInput['activityLevel'] })}><option value="sedentary">{t('Sedentário')}</option><option value="light">{t('Ligeiramente ativo (1–3 dias/semana)')}</option><option value="moderate">{t('Moderadamente ativo (3–5 dias/semana)')}</option><option value="very-active">{t('Muito ativo (6–7 dias/semana)')}</option><option value="extra-active">{t('Extremamente ativo')}</option></select></Field>
      <Field label="Objetivo"><select className="input mt-2" value={profile.nutritionGoal} onChange={(e) => setProfile({ ...profile, nutritionGoal: e.target.value as NutritionProfileInput['nutritionGoal'] })}><option value="lose">{t('Perder peso gradualmente')}</option><option value="maintain">{t('Manter o peso')}</option><option value="gain">{t('Ganhar peso gradualmente')}</option></select></Field>
    </div>

    <fieldset>
      <legend className="text-sm font-bold">{t('Como queres definir os teus objetivos diários?')}</legend>
      <p className="mt-1 text-xs text-stone-400">{t('Podemos estimá-los com as respostas acima ou podes introduzir um plano que já tenhas definido.')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={`cursor-pointer rounded-2xl border p-4 transition ${!manual ? 'border-leaf-500 bg-leaf-500/10' : 'border-white/10 bg-white/5'}`}>
          <input className="sr-only" type="radio" name="goal-mode" checked={!manual} onChange={() => setManual(false)} />
          <span className="font-bold">{t('Calcular por mim')}</span><span className="mt-1 block text-xs text-stone-400">{t('Usar idade, corpo, atividade e objetivo.')}</span>
        </label>
        <label className={`cursor-pointer rounded-2xl border p-4 transition ${manual ? 'border-leaf-500 bg-leaf-500/10' : 'border-white/10 bg-white/5'}`}>
          <input className="sr-only" type="radio" name="goal-mode" checked={manual} onChange={() => { setManual(true); setManualGoals(calculated); }} />
          <span className="font-bold">{t('Já tenho valores definidos')}</span><span className="mt-1 block text-xs text-stone-400">{t('Introduzir calorias e macros manualmente.')}</span>
        </label>
      </div>
    </fieldset>

    <div className="rounded-3xl border border-leaf-500/20 bg-leaf-500/10 p-5">
      <div><p className="font-bold">{t(manual ? 'Os teus objetivos diários' : 'Objetivos diários estimados')}</p><p className="text-xs text-stone-400">{t(manual ? 'Introduz os valores do teu plano atual.' : 'Calculados a partir das respostas acima.')}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><GoalInput label="Calorias" unit="kcal" value={goals.calories} disabled={!manual} onChange={(value) => setManualGoals({ ...manualGoals, calories: value })} onBlur={() => updateManualCalories(manualGoals.calories)} /><GoalInput label="Proteína" unit="g" value={goals.protein} disabled={!manual} onChange={(value) => setManualGoals({ ...manualGoals, protein: value })} /><GoalInput label="Hidratos" unit="g" value={goals.carbs} disabled={!manual} onChange={(value) => setManualGoals({ ...manualGoals, carbs: value })} /><GoalInput label="Gordura" unit="g" value={goals.fat} disabled={!manual} onChange={(value) => setManualGoals({ ...manualGoals, fat: value })} /></div>
      {manual && <p className="mt-3 text-xs text-stone-400">{t('Ao alterar as calorias, proteína, hidratos e gordura são recalculados com base no teu peso e na nova meta calórica. Depois podes editar cada macro individualmente.')}</p>}
    </div>

    <p className="text-xs leading-relaxed text-stone-500">{t('Estimativa para adultos saudáveis baseada em equações populacionais. Necessidades reais podem variar; gravidez, amamentação, condições clínicas ou histórico de perturbações alimentares requerem acompanhamento profissional.')}</p>
    <button disabled={saving} className="w-full rounded-2xl bg-leaf-600 px-5 py-3.5 font-bold text-white disabled:opacity-60">{saving ? t('A guardar...') : submitLabel}</button>
    {feedback && <div role="status" className={`animate-toast-out fixed right-5 top-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${feedback.type === 'success' ? 'border-leaf-500/30 bg-[#251a35]/95 text-purple-100' : 'border-rose-500/30 bg-[#351522]/95 text-rose-100'}`}>
      {feedback.type === 'success' ? <CheckCircle2 className="shrink-0 text-leaf-500" size={21} /> : <XCircle className="shrink-0 text-rose-400" size={21} />}
      <p className="text-sm font-semibold">{feedback.message}</p>
      <button type="button" onClick={() => setFeedback(null)} className="ml-1 rounded-lg p-1 opacity-60 hover:bg-white/10 hover:opacity-100" aria-label="Fechar notificação"><X size={16} /></button>
    </div>}
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { const { t } = useTranslation(); return <label className="text-sm font-semibold">{t(label)}{children}</label>; }
function GoalInput({ label, unit, value, disabled, onChange, onBlur }: { label: string; unit: string; value: number; disabled: boolean; onChange: (value: number) => void; onBlur?: () => void }) { const { t } = useTranslation(); return <label className="text-xs font-semibold text-stone-400">{t(label)}<span className="relative mt-1 block"><NumberInput className="input px-3 py-2 pr-10 text-white disabled:opacity-80" min="0" disabled={disabled} required value={value} onValueChange={onChange} onBlur={onBlur} /><span className="absolute right-2 top-2.5 text-[10px]">{unit}</span></span></label>; }

function goalsMatch(first: NutritionGoals, second: NutritionGoals) {
  return first.calories === second.calories
    && first.protein === second.protein
    && first.carbs === second.carbs
    && first.fat === second.fat;
}
