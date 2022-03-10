import { useMemo } from 'react';
import useSessionStorage from './useSessionStorage';

const { sessionStorage } = window;

/**
 * useSessionFilters takes in an key and an array of default filters
 * and returns a useState like array of a getter and a setter
 * while updating the filters in the session
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useSessionFilters(key, initialValue) {
  const initial = useMemo(() => {
    try {
      const filtersFromStorage = sessionStorage.getItem(key);
      if (filtersFromStorage) {
        return JSON.parse(filtersFromStorage);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error); // we're "catching" this by returning the default value
    }

    return initialValue;
  }, [initialValue, key]);

  const [filters, setFilters] = useSessionStorage(key, initial);

  return [filters, setFilters];
}
