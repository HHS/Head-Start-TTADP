import moment from 'moment';

/**
 * Ensures the input is an array. If the input is not an array, returns an empty array.
 * @param input - The value to check.
 * @returns The input if it's an array, or an empty array.
 */
export function ensureArray<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [];
}

/**
 * Returns a formatted date string in 'MM/DD/YYYY' format if the input is a valid date,
 * otherwise returns null.
 * @param value - The date value to format.
 * @returns The formatted date string in 'MM/DD/YYYY' format, or null if the input is invalid.
 */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = moment(value, [moment.ISO_8601, 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
  if (!parsed.isValid()) {
    return null;
  }

  return parsed.format('MM/DD/YYYY');
}

/**
 * Returns an array of unique, non-null, and non-undefined strings from the input array.
 * @param values - The array of strings to filter.
 * @returns An array of unique strings.
 */
export function uniqueStrings(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}
