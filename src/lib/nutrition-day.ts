export const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * A nutrition day ends at 04:00. Until then, meals belong to the previous
 * calendar date so late dinners keep their calories and macros together.
 */
export const nutritionDay = (now = new Date()) => {
  const date = new Date(now);
  date.setHours(date.getHours() - 4);
  return formatLocalDate(date);
};
