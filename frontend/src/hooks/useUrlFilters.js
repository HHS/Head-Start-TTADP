import { useEffect, useMemo } from 'react';
import { queryStringToFilters, filtersToQueryString } from '../utils';
import useSessionStorage from './useSessionStorage';

// hoisting this fellow as to not get embroiled in useEffects
const { history, sessionStorage } = window;

/**
 * useUrlFilters takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useUrlFilters(key, defaultFilters) {
  // initial state should derive from whats in the url if possible
  // we don't want to be doing this every time the component rerenders so we store it in a usememo
  const initialValue = useMemo(() => {
    const params = queryStringToFilters(new URL(window.location).search.substr(1));
    if (params.length) {
      return params;
    }

    try {
      const cookieFromStorage = sessionStorage.getItem(key);
      if (cookieFromStorage) {
        return JSON.parse(cookieFromStorage);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error); // we're "catching" this by returning the default value
    }

    return defaultFilters;
  }, [defaultFilters, key]);

  const [filters, setFilters] = useSessionStorage(key, initialValue);

  // use effect to watch the query and update if changed
  useEffect(() => {
    // create our query string
    const search = filtersToQueryString(filters);
    history.pushState(null, null, `?${search}`);
  }, [filters, key]);

  return [filters, setFilters];
}
