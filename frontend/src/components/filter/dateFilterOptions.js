import moment from 'moment';
import { formatDateRange } from '../../utils';

export const DATE_OPTIONS = [
  { key: 'lastThirtyDays', label: 'Last thirty days' },
  { key: 'yearToDate', label: 'Year to date' },
  { key: 'lastTwelveMonths', label: 'Last twelve months' },
];

/**
 * Resolves a semantic date key to a computed date range string for API consumption.
 * Storing keys (e.g. 'lastThirtyDays') instead of pre-computed date strings ensures
 * the filter UI restores correctly across days and browser sessions.
 *
 * Falls back to returning the input unchanged for legacy stored date strings.
 */
export function resolveIsQuery(key) {
  switch (key) {
    case 'lastThirtyDays':
      return formatDateRange({ lastThirtyDays: true, forDateTime: true });
    case 'yearToDate':
      return formatDateRange({ yearToDate: true, forDateTime: true });
    case 'lastTwelveMonths':
      return formatDateRange({ lastTwelveMonths: true, forDateTime: true });
    default:
      return key;
  }
}

/**
 * Converts a stored date query (semantic key, date-range string, or single date) to
 * a human-readable display string for filter pills.
 */
export function displayDateQuery(smushed) {
  if (!smushed) return '';
  const resolved = resolveIsQuery(smushed);
  if (resolved !== smushed) {
    return formatDateRange({ string: resolved, withSpaces: false });
  }
  if (smushed.includes('-')) {
    return formatDateRange({ string: smushed, withSpaces: false });
  }
  const d = moment(smushed, 'YYYY/MM/DD');
  return d.isValid() ? d.format('MM/DD/YYYY') : '';
}
