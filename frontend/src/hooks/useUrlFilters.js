import { useMemo } from 'react';
import { filtersToQueryString, queryStringToFilters } from '../utils';

// hoisting this fellow as to not get embroiled in useEffects
const { history } = window;

/**
 * useUrlFilters takes in an array of default filters
 * and watches them to update the URL in a useEffect
 *
 * @param {String} key
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(defaultFilters) {
  // initial state should derive from whats in the url if possible
  // we don't want to be doing this every time the component rerenders so we store it in a usememo
  const initialValue = useMemo(() => {
    const params = queryStringToFilters(new URL(window.location).search.substr(1));

    if (params.length) {
      return params;
    }
    return defaultFilters;
  }, [defaultFilters]);

  // use effect to watch the query and update if changed
  const updateUrl = (filters) => {
    // create our query string
    const search = filtersToQueryString(filters);
    history.pushState(null, null, `?${search}`);
  };

  return [initialValue, updateUrl];
}
