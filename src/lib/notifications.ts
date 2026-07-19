export async function showAppNotification(title: string, body: string) {
  window.dispatchEvent(new CustomEvent('meal-tracker-notification', { detail: { title, body } }));
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const options = { body, icon: '/meal-tracker-icon.svg' };
  try {
    // Do not wait for serviceWorker.ready here: in local development it can
    // stay pending, which would prevent the notification from ever showing.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.active) {
      await registration.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch { return false; }
}
