import useSessionFilters from './useSessionFilters';
import useUrlFilters from './useUrlFilters';

/**
 * useSessionFiltersAndReflectInUrl takes in an array of default filters
 * and returns a useState like array of a getter and a setter
 * while updating the filters in the session storage and in the URL
 *
 * @param {Object[]} defaultFilters
 * @returns {[ Object[], Function ]}
 */
export default function useSessionFiltersAndReflectInUrl(key, defaultFilters) {
  const [filters, setFilters] = useSessionFilters(key, defaultFilters);

  useUrlFilters(filters);

  return [filters, setFilters];
}
