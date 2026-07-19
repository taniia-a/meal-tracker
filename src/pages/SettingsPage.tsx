import NutritionProfileForm from '../components/NutritionProfileForm';
import { useMeals } from '../store/MealContext';
import { useTranslation } from 'react-i18next';
import NumberInput from '../components/NumberInput';
import { FormEvent, useEffect, useState } from 'react';
import { getReminderSettings, ReminderSettings, saveReminderSettings } from '../lib/reminders';
import { showAppNotification } from '../lib/notifications';
import { sendPushTest, subscribeToPush, unsubscribeFromPush } from '../lib/push';
import { authClient } from '../lib/auth';

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

  return <div className="mx-auto max-w-3xl"><p className="font-semibold text-leaf-700">{t('Preferências')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Definições')}</h1><p className="mt-2 text-stone-400">{t('Atualiza os teus dados, recalcula o plano ou define objetivos manualmente.')}</p><section className="card mt-8 p-7"><NutritionProfileForm initialProfile={profile} initialGoals={profile.goals} initialGoalMode={profile.goalMode} submitLabel={t('Guardar alterações')} onSave={updateProfile} /></section><section className="card mt-6 p-7"><h2 className="text-xl font-bold">{t('Objetivo diário de água')}</h2><p className="mt-1 text-sm text-stone-400">{t('Define a quantidade de água que queres acompanhar todos os dias.')}</p><form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={saveWaterGoal}><label className="text-sm font-semibold sm:w-56">{t('Água por dia (ml)')}<NumberInput className="input mt-2" min="250" max="10000" step="50" required value={waterGoal} onValueChange={setWaterGoal} /></label><button disabled={savingWater} className="rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60">{savingWater ? t('A guardar...') : t('Guardar objetivo de água')}</button></form>{waterFeedback && <p role="status" className="mt-3 text-sm font-semibold text-leaf-600">{waterFeedback}</p>}</section><section className="card mt-6 p-7"><h2 className="text-xl font-bold">{t('Ingredientes a evitar')}</h2><p className="mt-1 text-sm text-stone-400">{t('Não serão sugeridas receitas que incluam estes ingredientes.')}</p><form className="mt-5" onSubmit={saveDislikedIngredients}><label className="block text-sm font-semibold">{t('Ingredientes separados por vírgulas')}<textarea className="input mt-2 min-h-24 resize-y" value={dislikedIngredients} onChange={(event) => setDislikedIngredients(event.target.value)} placeholder={t('Ex.: cogumelos, atum, coentros')} /></label><button disabled={savingDisliked} className="mt-4 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60">{savingDisliked ? t('A guardar...') : t('Guardar ingredientes')}</button></form>{dislikedFeedback && <p role="status" className="mt-3 text-sm font-semibold text-leaf-600">{dislikedFeedback}</p>}</section><PasswordSettingsPanel /><ReminderSettingsPanel /></div>;
}

type ChangePasswordClient = { changePassword: (input: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }) => Promise<{ error?: { message?: string } | null }> };

function PasswordSettingsPanel() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [hasError, setHasError] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(''); setHasError(false);
    if (newPassword !== confirmation) { setHasError(true); setFeedback(t('As novas palavras-passe não coincidem.')); return; }
    if (newPassword.length < 8) { setHasError(true); setFeedback(t('A nova palavra-passe deve ter pelo menos 8 caracteres.')); return; }
    if (!authClient) { setHasError(true); setFeedback(t('Não foi possível contactar o serviço de autenticação.')); return; }
    setSaving(true);
    try {
      const client = authClient as unknown as ChangePasswordClient;
      const result = await client.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
      if (result.error) { setHasError(true); setFeedback(result.error.message || t('Não foi possível alterar a palavra-passe.')); return; }
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
      setFeedback(t('Palavra-passe alterada com sucesso.'));
    } catch (error) { setHasError(true); setFeedback(error instanceof Error ? error.message : t('Não foi possível alterar a palavra-passe.')); }
    finally { setSaving(false); }
  };

  return <section className="card mt-6 p-7"><h2 className="text-xl font-bold">{t('Palavra-passe')}</h2><p className="mt-1 text-sm text-stone-400">{t('Altera a tua palavra-passe mantendo a sessão atual iniciada.')}</p><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}><label className="block text-sm font-semibold sm:col-span-2">{t('Palavra-passe atual')}<input className="input mt-2" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label className="block text-sm font-semibold">{t('Nova palavra-passe')}<input className="input mt-2" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label className="block text-sm font-semibold">{t('Confirmar nova palavra-passe')}<input className="input mt-2" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><div className="sm:col-span-2"><button disabled={saving} className="rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? t('A guardar...') : t('Alterar palavra-passe')}</button>{feedback && <p role="status" className={`mt-3 text-sm font-semibold ${hasError ? 'text-rose-300' : 'text-leaf-600'}`}>{feedback}</p>}</div></form></section>;
}

function ReminderSettingsPanel() {
  const { profile } = useMeals();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ReminderSettings>(() => getReminderSettings(profile.userId));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const [feedback, setFeedback] = useState('');

  useEffect(() => setSettings(getReminderSettings(profile.userId)), [profile.userId]);
  useEffect(() => {
    if (permission === 'granted' && (settings.meals || settings.water || settings.weight)) {
      void subscribeToPush(settings).catch((error) => setFeedback(error instanceof Error ? error.message : t('Não foi possível ativar as notificações push.')));
    }
  }, [permission, profile.userId]);
  const update = (next: ReminderSettings) => {
    setSettings(next);
    saveReminderSettings(profile.userId, next);
    if (permission === 'granted') {
      if (next.meals || next.water || next.weight) void subscribeToPush(next).catch((error) => setFeedback(error instanceof Error ? error.message : t('Não foi possível ativar as notificações push.')));
      else void unsubscribeFromPush();
    }
  };
  const enableNotifications = async () => {
    if (permission === 'granted') {
      const hasActive = settings.meals || settings.water || settings.weight;
      const next = { ...settings, meals: !hasActive, water: !hasActive, weight: !hasActive };
      update(next);
      if (!hasActive) void showAppNotification('Meal Tracker', t('Notificações ativadas com sucesso.'));
      setFeedback(hasActive ? t('Lembretes desativados.') : t('Notificações ativadas com sucesso.'));
      return;
    }
    if (!('Notification' in window)) { setPermission('unsupported'); return; }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      const next = { ...settings, meals: true, water: true, weight: true };
      setSettings(next); saveReminderSettings(profile.userId, next);
      try { await subscribeToPush(next); } catch (error) { setFeedback(error instanceof Error ? error.message : t('Não foi possível ativar as notificações push.')); return; }
      void showAppNotification('Meal Tracker', t('Notificações ativadas com sucesso.'));
    }
    setFeedback(result === 'granted' ? t('Notificações ativadas com sucesso.') : t('Permite as notificações nas definições do navegador para receber lembretes.'));
  };
  const toggle = (key: 'meals' | 'water' | 'weight') => update({ ...settings, [key]: !settings[key] });
  const time = (key: 'mealsTime' | 'weightTime', value: string) => update({ ...settings, [key]: value });
  const row = (key: 'meals' | 'weight', timeKey: 'mealsTime' | 'weightTime', label: string, description: string) => <div className="flex flex-col gap-3 border-t border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{t(label)}</p><p className="mt-1 text-sm text-stone-400">{t(description)}</p></div><div className="flex items-center gap-3"><input className="input h-11 w-32" type="time" disabled={!settings[key]} value={settings[timeKey]} onChange={(event) => time(timeKey, event.target.value)} /><button type="button" role="switch" aria-checked={settings[key]} onClick={() => toggle(key)} className={`h-7 w-12 rounded-full p-1 transition ${settings[key] ? 'bg-leaf-600' : 'bg-white/10'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${settings[key] ? 'translate-x-5' : ''}`} /></button></div></div>;
  const hasActiveReminders = settings.meals || settings.water || settings.weight;
  const testNotification = async () => {
    if (permission !== 'granted') { await enableNotifications(); return; }
    try { await subscribeToPush(settings); await sendPushTest(); setFeedback(t('Notificação push de teste enviada.')); }
    catch (error) { setFeedback(error instanceof Error ? error.message : t('Não foi possível enviar a notificação push de teste.')); }
  };
  return <section className="card mt-6 p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="text-xl font-bold">{t('Lembretes')}</h2><p className="mt-1 text-sm text-stone-400">{t('Escolhe quando queres ser lembrada de acompanhar o teu dia.')}</p></div><div className="flex gap-2"><button type="button" onClick={() => void testNotification()} className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-stone-200">{t('Testar')}</button><button type="button" onClick={() => void enableNotifications()} className="rounded-2xl border border-leaf-500/40 px-4 py-2 text-sm font-bold text-leaf-300">{permission === 'granted' && hasActiveReminders ? t('Desativar lembretes') : t('Ativar notificações')}</button></div></div><div className="mt-5">{row('meals', 'mealsTime', 'Refeições', 'Lembra-te de registar uma refeição caso ainda não o tenhas feito.')}<div className="flex flex-col gap-3 border-t border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{t('Água')}</p><p className="mt-1 text-sm text-stone-400">{t('Recebe um lembrete de hora a hora entre as 08:00 e as 22:00, até atingires o objetivo.')}</p></div><button type="button" role="switch" aria-checked={settings.water} onClick={() => toggle('water')} className={`h-7 w-12 rounded-full p-1 transition ${settings.water ? 'bg-leaf-600' : 'bg-white/10'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${settings.water ? 'translate-x-5' : ''}`} /></button></div>{row('weight', 'weightTime', 'Peso', 'Recebe um lembrete semanal ao domingo para registar o peso.')}</div><p className="mt-2 text-xs text-stone-500">{t('Os lembretes funcionam enquanto o site estiver aberto neste dispositivo.')}</p>{feedback && <p role="status" className="mt-3 text-sm font-semibold text-leaf-600">{feedback}</p>}</section>;
}
