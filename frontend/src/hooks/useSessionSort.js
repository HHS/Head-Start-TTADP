import { useMemo, useContext } from 'react';
import useSessionStorage from './useSessionStorage';
import FilterContext from '../FilterContext';

const { sessionStorage } = window;

/**
 * useCookieSorting takes in an object containing a sort configuration
 * ex: {
    sortBy: 'updatedAt',
    direction: 'desc',
    activePage: 0
  }
 * and a component name
 * and returns a useState like array of a getter and a setter
 *
 * @param {Object[]} defaultSortConfig
 * @param {String} component
 * @returns {[ Object[], Function ]}
 */
export default function useSessionSort(defaultSortConfig, key) {
  const { filterKey } = useContext(FilterContext);
  const sessionSchema = `${key}-sorting`;

  const existingSort = useMemo(() => {
    const currentFilterStorage = sessionStorage.getItem(filterKey);
    if (currentFilterStorage) {
      try {
        const currentStorage = sessionStorage.getItem(sessionSchema);
        if (currentStorage) {
          const parsedStorage = JSON.parse(currentStorage);
          // this is really just to make sure nothing weird gets in there
          const {
            sortBy, direction, activePage,
          } = parsedStorage;
          return {
            sortBy,
            direction,
            activePage: parseInt(activePage, 10),
          };
        }
      } catch (error) {
        return false;
      }
    }

    return false;
  }, [filterKey, sessionSchema]);

  // put it in state
  const [sortConfig, setSortConfig] = useSessionStorage(
    sessionSchema,
    existingSort || defaultSortConfig,
  );

  return [sortConfig, setSortConfig];
}
