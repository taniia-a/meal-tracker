export type ReminderKind = 'meals' | 'water' | 'weight';

export type ReminderSettings = {
  meals: boolean;
  mealsTime: string;
  water: boolean;
  waterIntervalMinutes: number;
  weight: boolean;
  weightTime: string;
};

export const defaultReminderSettings: ReminderSettings = {
  meals: false,
  mealsTime: '21:00',
  water: false,
  waterIntervalMinutes: 60,
  weight: false,
  weightTime: '08:00',
};

const key = (userId: string) => `meal-tracker-reminders-${userId}`;

export function getReminderSettings(userId: string): ReminderSettings {
  try {
    const saved = localStorage.getItem(key(userId));
    return saved ? { ...defaultReminderSettings, ...JSON.parse(saved) } : defaultReminderSettings;
  } catch { return defaultReminderSettings; }
}

export function saveReminderSettings(userId: string, settings: ReminderSettings) {
  localStorage.setItem(key(userId), JSON.stringify(settings));
}

export function wasReminderSent(userId: string, day: string, kind: ReminderKind) {
  return localStorage.getItem(`meal-tracker-reminder-sent-${userId}-${day}-${kind}`) === '1';
}

export function markReminderSent(userId: string, day: string, kind: ReminderKind) {
  localStorage.setItem(`meal-tracker-reminder-sent-${userId}-${day}-${kind}`, '1');
}

export function canSendRepeatingReminder(userId: string, kind: ReminderKind, intervalMinutes: number) {
  const key = `meal-tracker-reminder-last-${userId}-${kind}`;
  const last = Number(localStorage.getItem(key) || 0);
  if (Date.now() - last < intervalMinutes * 60_000) return false;
  localStorage.setItem(key, String(Date.now()));
  return true;
}

export function timeReached(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
}

export function isWaterReminderWindow() {
  const hour = new Date().getHours();
  return hour >= 8 && hour < 22;
}
