import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const initial = useMemo(() => {
    // If URL has query parameters, prioritize them over session storage
    // This ensures bookmarks with filters always work correctly
    const hasUrlParams = location.search && location.search.length > 1;
    if (hasUrlParams && initialValue && initialValue.length > 0) {
      return initialValue;
    }

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
  }, [initialValue, key, location.search]);

  const [filters, setFilters] = useSessionStorage(key, initial);

  return [filters, setFilters];
}
