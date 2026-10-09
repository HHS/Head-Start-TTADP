import { useEffect, useRef } from 'react';
import useSession from './useSession';
import useUrlFilters from './useUrlFilters';

/**
 * useSessionFiltersAndReflectInUrl takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 * while updating the filters in the session storage and in the URL
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useSessionFiltersAndReflectInUrl(
  key,
  defaultFilters,
  replaceInitialUrl = false
) {
  const [initialValue, updateUrl] = useUrlFilters(defaultFilters, key);
  const [filters, setFilters] = useSession(key, initialValue);
  const initialSync = useRef(true);
  const previousFilters = useRef(filters);

  useEffect(() => {
    const isInitialSync = initialSync.current;
    const explicitlyCleared =
      !isInitialSync && previousFilters.current.length > 0 && filters.length === 0;
    const initiallyEmpty = replaceInitialUrl && isInitialSync && filters.length === 0;
    updateUrl(filters, replaceInitialUrl && isInitialSync, explicitlyCleared || initiallyEmpty);
    initialSync.current = false;
    previousFilters.current = filters;
  }, [filters, replaceInitialUrl, updateUrl]);

  return [filters, setFilters];
}
