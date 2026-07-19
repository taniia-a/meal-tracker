import { useEffect } from 'react';
import { useMeals } from '../store/MealContext';
import { nutritionDay } from '../lib/nutrition-day';
import { canSendRepeatingReminder, getReminderSettings, isWaterReminderWindow, markReminderSent, timeReached, wasReminderSent } from '../lib/reminders';
import { showAppNotification } from '../lib/notifications';

export default function ReminderScheduler() {
  const { profile, waterConsumedMl, entries } = useMeals();

  useEffect(() => {
    const checkReminders = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const settings = getReminderSettings(profile.userId);
      const day = nutritionDay();
      const notify = (kind: 'meals' | 'water' | 'weight', title: string, body: string) => {
        if (wasReminderSent(profile.userId, day, kind)) return;
        void showAppNotification(title, body);
        markReminderSent(profile.userId, day, kind);
      };

      const mealTypesToday = new Set(entries.filter((entry) => entry.date === day).map((entry) => entry.mealType));
      if (settings.meals && mealTypesToday.size < 4 && timeReached(settings.mealsTime)) {
        notify('meals', 'Meal Tracker', 'Não te esqueças de registar as tuas refeições de hoje.');
      }
      if (settings.water && isWaterReminderWindow() && waterConsumedMl < profile.waterGoalMl && canSendRepeatingReminder(profile.userId, 'water', 60)) {
        void showAppNotification('Meal Tracker', 'Ainda não atingiste o teu objetivo de água de hoje.');
      }
      // Sunday gives a predictable weekly prompt without requiring another database table.
      if (settings.weight && new Date().getDay() === 0 && timeReached(settings.weightTime)) {
        notify('weight', 'Meal Tracker', 'Está na altura de registar o teu peso desta semana.');
      }
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [profile, waterConsumedMl, entries]);

  return null;
}
