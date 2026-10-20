import moment from 'moment';
import { DISPLAY_DATE_FORMATS } from '../constants';

/**
 * Attempts to parse a date string using multiple known formats.
 * Returns a valid Date object or null if parsing fails.
 *
 * The accepted formats are shared with the route validators via
 * DISPLAY_DATE_FORMATS, so this parser and the schemas that guard the requests
 * feeding it cannot drift apart.
 */
function safeParseDate(value: string | undefined | null): Date | null {
  if (!value) return null;

  const parsed = DISPLAY_DATE_FORMATS.find((format) => moment(value, format, true).isValid());
  return parsed ? moment(value, parsed, true).toDate() : null;
}

export { safeParseDate };
