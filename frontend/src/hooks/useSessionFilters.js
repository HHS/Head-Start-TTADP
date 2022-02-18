import { useMemo } from 'react';
import { queryStringToFilters } from '../utils';
import useSessionStorage from './useSessionStorage';

// hoisting this fellow as to not get embroiled in useEffects
const { sessionStorage } = window;

/**
 * useSessionFilters takes in an key and an array of default filters
 * and returns a useState like array of a getter and a setter
 * while updating the filters in the session
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useSessionFilters(key, defaultFilters) {
  // initial state should derive from whats in the url if possible
  // we don't want to be doing this every time the component rerenders so we store it in a usememo
  const initialValue = useMemo(() => {
    const params = queryStringToFilters(new URL(window.location).search.substr(1));

    if (params.length) {
      return params;
    }

    try {
      const filtersFromStorage = sessionStorage.getItem(key);
      if (filtersFromStorage) {
        return JSON.parse(filtersFromStorage);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error); // we're "catching" this by returning the default value
    }

    return defaultFilters;
  }, [defaultFilters, key]);

  const [filters, setFilters] = useSessionStorage(key, initialValue);

  return [filters, setFilters];
}
