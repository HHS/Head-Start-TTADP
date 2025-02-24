/**
 * Ensures the input is an array. If the input is not an array, returns an empty array.
 * @param input - The value to check.
 * @returns The input if it's an array, or an empty array.
 */
export default function ensureArray<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [];
}
