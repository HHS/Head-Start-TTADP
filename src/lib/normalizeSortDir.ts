export type SortDirection = 'ASC' | 'DESC';

/**
 * Reduces a caller-supplied sort direction to 'ASC' or 'DESC'.
 *
 * Sort directions come from requests and are often interpolated into SQL literals,
 * so anything other than a case-insensitive 'asc' falls back to 'DESC'.
 */
export default function normalizeSortDir(sortDir: unknown): SortDirection {
  return typeof sortDir === 'string' && sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}
