import { useEffect, useMemo } from 'react';
import useSession from './useSession';
import useUrlFilters from './useUrlFilters';
import { expandFilters } from '../utils';

/**
 * useSessionFiltersAndReflectInUrl takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 * while updating the filters in the session storage and in the URL
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useSessionFiltersAndReflectInUrl(key, defaultFilters) {
  const [initialValue, updateUrl] = useUrlFilters(defaultFilters);
  const [filters, setFilters] = useSession(key, initialValue);

  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  useEffect(() => {
    updateUrl(filtersToApply);
  }, [filtersToApply, updateUrl]);

  return [filtersToApply, setFilters];
}
