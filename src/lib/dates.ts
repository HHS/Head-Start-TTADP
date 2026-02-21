import { DateTime } from 'luxon';

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
