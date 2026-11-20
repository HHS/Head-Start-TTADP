import parsePositiveInteger from './parsePositiveInteger';

/**
 * Extracts the unique, positive integer IDs from a form selection ([{ value, label }]).
 * Entries that are missing, null or not a whole number (such as 99.1) are dropped.
 */
export default function parseSelectionIds(selections: unknown): number[] {
  if (!Array.isArray(selections)) return [];

  const ids = selections
    .map((selection) => parsePositiveInteger(selection?.value))
    .filter((id): id is number => id !== null);

  return [...new Set(ids)];
}
