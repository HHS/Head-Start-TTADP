import { useMemo, useContext } from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import useSessionStorage from './useSessionStorage';
import FilterContext from '../FilterContext';

const { sessionStorage } = window;

/**
 * useSessionSort takes in an object containing a sort configuration
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
  const sessionSchema = `${filterKey}-${key}-sorting`;

  const existingSort = useMemo(() => {
    const currentFilterStorage = sessionStorage.getItem(filterKey);
    if (currentFilterStorage) {
      try {
        const currentStorage = sessionStorage.getItem(sessionSchema);
        if (currentStorage) {
          const parsedStorage = JSON.parse(currentStorage);
          // this is really just to make sure nothing weird gets in there
          const {
            sortBy, direction, activePage, offset,
          } = parsedStorage;
          return {
            sortBy,
            direction,
            offset: parseInt(offset, DECIMAL_BASE),
            activePage: parseInt(activePage, DECIMAL_BASE),
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
