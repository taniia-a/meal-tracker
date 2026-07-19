export const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The nutrition day follows the local calendar day and changes at midnight. */
export const nutritionDay = (now = new Date()) => formatLocalDate(now);
