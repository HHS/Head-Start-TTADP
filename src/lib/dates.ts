import { DateTime } from 'luxon';

/**
 * Convert a moment-style format string to a Luxon format string.
 * Handles: escaped literals, year, day, and month name tokens.
 */
export const toLuxonFormat = (format: string): string => format
  .replace(/\[([^\]]+)\]/g, "'$1'")
  .replace(/YYYY/g, 'yyyy')
  .replace(/YY/g, 'yy')
  .replace(/DD/g, 'dd')
  .replace(/D/g, 'd')
  .replace(/MMMM/g, 'LLLL')
  .replace(/MMM/g, 'LLL');

/**
 * Attempt to parse a date string against an array of moment-style format strings.
 * Returns the first valid DateTime or null.
 */
export const parseFromFormats = (value: string, formats: string[]): DateTime | null => {
  const format = formats.find((f) => DateTime.fromFormat(value, toLuxonFormat(f)).isValid);
  if (!format) {
    return null;
  }
  const parsed = DateTime.fromFormat(value, toLuxonFormat(format));
  return parsed.isValid ? parsed : null;
};

/**
 * Parse an ISO-like date string as UTC and return a JS Date if valid.
 */
const parseUtcDateString = (value: string): Date | null => {
  const parsed = DateTime.fromISO(value, { zone: 'utc' });
  if (!parsed.isValid) {
    return null;
  }

  return parsed.toJSDate();
};

export default parseUtcDateString;
