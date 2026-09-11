function observedDate(year: number, month: number, day: number): Date {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  } else if (date.getUTCDay() === 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function weekdayInMonth(year: number, month: number, weekday: number, occurrence: number): Date {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return new Date(
    Date.UTC(year, month - 1, 1 + ((weekday - firstDay + 7) % 7) + 7 * (occurrence - 1))
  );
}

/**
 * Observed dates for recurring nationwide federal holidays in the given holiday year.
 * Uses the standard Monday–Friday schedule; a Saturday New Year's Day is observed
 * in the preceding calendar year. Dates use UTC solely to avoid server timezone/DST shifts.
 * Source: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
 */
export default function federalHolidays(year: number): string[] {
  const lastDayOfMay = new Date(Date.UTC(year, 4, 31));
  lastDayOfMay.setUTCDate(31 - ((lastDayOfMay.getUTCDay() + 6) % 7));

  const holidays = [
    observedDate(year, 1, 1), // New Year's Day
    weekdayInMonth(year, 1, 1, 3), // Birthday of Martin Luther King, Jr.
    weekdayInMonth(year, 2, 1, 3), // Washington's Birthday
    lastDayOfMay, // Memorial Day (last Monday in May)
    ...(year >= 2021 ? [observedDate(year, 6, 19)] : []), // Juneteenth
    observedDate(year, 7, 4), // Independence Day
    weekdayInMonth(year, 9, 1, 1), // Labor Day
    weekdayInMonth(year, 10, 1, 2), // Columbus Day
    observedDate(year, 11, 11), // Veterans Day
    weekdayInMonth(year, 11, 4, 4), // Thanksgiving Day
    observedDate(year, 12, 25), // Christmas Day
  ];

  return holidays.map((date) => date.toISOString().slice(0, 10));
}
