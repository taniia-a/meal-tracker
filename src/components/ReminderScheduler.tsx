import { useEffect } from 'react';
import { useMeals } from '../store/MealContext';
import { nutritionDay } from '../lib/nutrition-day';
import { canSendRepeatingReminder, getReminderSettings, isWaterReminderWindow, markReminderSent, timeReached, wasReminderSent } from '../lib/reminders';

export default function ReminderScheduler() {
  const { entries, profile, waterConsumedMl } = useMeals();

  useEffect(() => {
    const checkReminders = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const settings = getReminderSettings(profile.userId);
      const day = nutritionDay();
      const notify = (kind: 'meals' | 'water' | 'weight', title: string, body: string) => {
        if (wasReminderSent(profile.userId, day, kind)) return;
        new Notification(title, { body, icon: '/favicon.svg' });
        markReminderSent(profile.userId, day, kind);
      };

      if (settings.meals && timeReached(settings.mealsTime) && !entries.some((entry) => entry.date === day && entry.isConsumed)) {
        notify('meals', 'Meal Tracker', 'Ainda não registaste nenhuma refeição hoje.');
      }
      if (settings.water && isWaterReminderWindow() && waterConsumedMl < profile.waterGoalMl && canSendRepeatingReminder(profile.userId, 'water', 60)) {
        new Notification('Meal Tracker', { body: 'Ainda não atingiste o teu objetivo de água de hoje.', icon: '/favicon.svg' });
      }
      // Sunday gives a predictable weekly prompt without requiring another database table.
      if (settings.weight && new Date().getDay() === 0 && timeReached(settings.weightTime)) {
        notify('weight', 'Meal Tracker', 'Está na altura de registar o teu peso desta semana.');
      }
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [entries, profile, waterConsumedMl]);

  return null;
}
