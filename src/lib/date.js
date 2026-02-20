import { parse, isValid } from 'date-fns';

/**
 * Attempts to parse a date string using multiple known formats.
 * Returns a valid Date object or null if parsing fails.
 */
export default function parseDate(value) {
  if (!value) return null;

  const formats = [
    // Slash formats
    'MM/dd/yyyy', 'M/d/yyyy', 'M/dd/yyyy', 'MM/d/yyyy',
    'MM/dd/yy', 'M/d/yy', 'M/dd/yy', 'MM/d/yy',

    // Dash formats
    'yyyy-MM-dd', 'yyyy-M-d', 'yyyy-M-dd', 'yyyy-MM-d',

    // Dot formats
    'M.d.yyyy', 'MM.d.yyyy', 'M.dd.yyyy',
    'M.d.yy', 'MM.dd.yy',
  ];

  const referenceDate = new Date();
  const matchedFormat = formats.find((fmt) => {
    const parsed = parse(value, fmt, referenceDate);
    return isValid(parsed) && !Number.isNaN(parsed.getTime());
  });
  return matchedFormat ? parse(value, matchedFormat, referenceDate) : null;
}
