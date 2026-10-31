import { DECIMAL_BASE } from '@ttahub/common';
import { type Dispatch, type SetStateAction, useContext, useMemo } from 'react';
import FilterContext from '../FilterContext';
import useSessionStorage from './useSessionStorage';

const { sessionStorage } = window;

export type SortDirection = 'asc' | 'desc';

/** The sort state a table or widget stashes in session storage. */
export interface SessionSortConfig {
  sortBy: string;
  direction: SortDirection;
  activePage?: number;
  offset?: number;
  perPage?: number | 'all';
}

/**
 * useSessionSort takes in an object containing a sort configuration
 * ex: {
    sortBy: 'updatedAt',
    direction: 'desc',
    activePage: 0
  }
 * and a component name
 * and returns a useState like array of a getter and a setter
 */
export default function useSessionSort<T extends SessionSortConfig>(
  defaultSortConfig: T,
  key: string
): [T, Dispatch<SetStateAction<T>>] {
  const { filterKey } = useContext(FilterContext);
  const sessionSchema = `${filterKey}-${key}-sorting`;
  const defaultPerPage = defaultSortConfig.perPage;

  const existingSort = useMemo(() => {
    const currentFilterStorage = sessionStorage.getItem(filterKey);
    if (currentFilterStorage) {
      try {
        const currentStorage = sessionStorage.getItem(sessionSchema);
        if (currentStorage) {
          const parsedStorage = JSON.parse(currentStorage);
          // this is really just to make sure nothing weird gets in there
          const { sortBy, direction, activePage, offset, perPage } = parsedStorage;
          return {
            sortBy,
            direction,
            offset: parseInt(offset, DECIMAL_BASE),
            activePage: parseInt(activePage, DECIMAL_BASE),
            ...(defaultPerPage !== undefined
              ? {
                  perPage:
                    perPage === 'all' || (Number.isSafeInteger(perPage) && perPage > 0)
                      ? perPage
                      : defaultPerPage,
                }
              : {}),
          } as T;
        }
      } catch (_error) {
        return false;
      }
    }

    return false;
  }, [filterKey, sessionSchema, defaultPerPage]);

  // put it in state
  const [sortConfig, setSortConfig] = useSessionStorage<T>(
    sessionSchema,
    existingSort || defaultSortConfig
  );

  return [sortConfig, setSortConfig];
}
