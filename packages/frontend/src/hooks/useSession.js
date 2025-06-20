import { useMemo } from 'react';
import useSessionStorage from './useSessionStorage';

const { sessionStorage } = window;

/**
 * useSession takes in an key and an array of default filters
 * and returns a useState like array of a getter and a setter
 * while updating the filters in the session
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useSession(key, initialValue) {
  const initial = useMemo(() => {
    try {
      const fromStorage = sessionStorage.getItem(key);
      if (fromStorage) {
        return JSON.parse(fromStorage);
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
