import { useMemo } from 'react';
import { useHistory, useLocation } from 'react-router';
import { filtersToQueryString, queryStringToFilters } from '../utils';

/**
 * useUrlFilters takes in an array of default filters
 * and watches them to update the URL in a useEffect
 *
 * @param {String} key
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(defaultFilters, filterKey) {
  const history = useHistory();
  const location = useLocation();

  // initial state should derive from whats in the url if possible
  // we don't want to be doing this every time the component rerenders so we store it in a usememo
  const initialValue = useMemo(() => {
    if (filterKey && location.state?.filtersExplicitlyEmptyFor === filterKey && !location.search) {
      return [];
    }
    const params = queryStringToFilters(location.search.substring(1));
    if (params.length) {
      return params;
    }
    return defaultFilters;
  }, [defaultFilters, filterKey, location.search, location.state]);

  const updateUrl = (filters, replace = false, explicitlyEmpty = false) => {
    const query = filtersToQueryString(filters);
    const search = query ? `?${query}` : '';
    const emptyState =
      filters.length === 0 &&
      (explicitlyEmpty || (filterKey && location.state?.filtersExplicitlyEmptyFor === filterKey))
        ? true
        : undefined;
    if (
      search === location.search &&
      location.state?.filtersExplicitlyEmptyFor ===
        (emptyState && filterKey ? filterKey : undefined)
    ) {
      return;
    }
    const update = replace ? history.replace : history.push;
    update({
      ...location,
      search,
      state: {
        ...location.state,
        filtersExplicitlyEmptyFor: emptyState ? filterKey : undefined,
      },
    });
  };

  return [initialValue, updateUrl];
}
