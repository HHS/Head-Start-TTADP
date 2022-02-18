import { useEffect } from 'react';
import { filtersToQueryString } from '../utils';

// hoisting this fellow as to not get embroiled in useEffects
const { history } = window;

/**
 * useUrlFilters takes in an array of default filters
 * and watches them to update the URL in a useEffect
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(filters) {
  // use effect to watch the query and update if changed
  useEffect(() => {
    // create our query string
    const search = filtersToQueryString(filters);
    history.pushState(null, null, `?${search}`);
  }, [filters]);
}
