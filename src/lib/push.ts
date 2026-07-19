import { getAuthToken } from './auth';
import { ReminderSettings } from './reminders';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function subscribeToPush(settings: ReminderSettings) {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) throw new Error('Falta configurar as notificações push.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este navegador não suporta notificações push.');
  const token = await getAuthToken();
  if (!token) throw new Error('A tua sessão expirou. Inicia sessão novamente.');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  const response = await fetch('/api/push-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, subscription: subscription.toJSON(), reminders: settings }) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? 'Não foi possível ativar as notificações push.');
}

export async function unsubscribeFromPush() {
  const token = await getAuthToken();
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (token && subscription) await fetch('/api/push-subscription', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, endpoint: subscription.endpoint }) });
  await subscription?.unsubscribe();
}

export async function sendPushTest() {
  const token = await getAuthToken();
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!token || !subscription) throw new Error('Este dispositivo ainda não está subscrito nas notificações push.');
  const response = await fetch('/api/push-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, endpoint: subscription.endpoint }) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? 'Não foi possível enviar a notificação push de teste.');
}
