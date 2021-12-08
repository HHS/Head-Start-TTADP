import { useEffect, useState } from 'react';
import { filtersToQueryString } from '../utils';

// hoisting this fellow as to not get embroiled in useEffects
const { history } = window;

/**
 * useUrlFilters takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultFilters
 * @param {String[]} paramsToHide filter topics that shouldn't display in the URL
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(defaultFilters = [], paramsToHide = []) {
  const [filters, setFilters] = useState(defaultFilters);

  // use effect to watch the query and update if changed
  useEffect(() => {
    const searchParams = filters.filter((filter) => !paramsToHide.includes(filter.topic));

    // create our query string
    const search = filtersToQueryString(searchParams);
    history.pushState(null, null, `?${search}`);
  }, [filters, paramsToHide]);

  return [filters, setFilters];
}
