import { DECIMAL_BASE } from '@ttahub/common';
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import useSessionSort, { type SessionSortConfig, type SortDirection } from './useSessionSort';

export type { SessionSortConfig, SortDirection };

/** The sort state these widgets keep, in session storage and in the table headers. */
export type WidgetSortConfig = SessionSortConfig;

/** A cell in a row shaped the way `HorizontalTableWidget` expects. */
export interface WidgetSortableCell {
  title: string;
  sortKey?: string;
  value: string | number;
}

/**
 * Rows come in two shapes: flat objects keyed by column name, or rows carrying a
 * `data` array of cells. Both are sorted by the column display name.
 */
export interface WidgetSortableRow {
  data?: WidgetSortableCell[];
  sortKey?: string | number;
  // rows are keyed by whatever their columns are called
  [key: string]: any;
}

export interface UseWidgetSorting {
  requestSort: (sortBy: string, passedDirection?: SortDirection | null) => void;
  sortConfig: WidgetSortConfig;
  setSortConfig: Dispatch<SetStateAction<WidgetSortConfig>>;
}

export const parseValue = <T>(value: T): T | number => {
  const noCommasValue = String(value).replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};

export default function useWidgetSorting<R extends WidgetSortableRow>(
  localStorageKey: string,
  defaultSortConfig: WidgetSortConfig,
  dataToUse: R[],
  setDataToUse: (data: R[]) => void,
  stringColumns: string[] = [],
  dateColumns: string[] = [],
  keyColumns: string[] = []
): UseWidgetSorting {
  const [sortConfig, setSortConfig] = useSessionSort<WidgetSortConfig>(
    defaultSortConfig,
    localStorageKey
  );

  const requestSort = useCallback(
    (sortBy: string, passedDirection: SortDirection | null = null) => {
      // Get sort direction.
      let direction: SortDirection = 'asc';
      // If we have a passed direction this means that we are sorting via a dropdown and not arrow.
      if (passedDirection) {
        // If the direction is passed, use it.
        direction = passedDirection;
      } else if (sortConfig && sortConfig.sortBy === sortBy && sortConfig.direction === 'asc') {
        direction = 'desc';
      }

      // make a lookup object with our columns and their types.
      const sorts: Record<string, 'string' | 'date' | 'key'> = {
        ...stringColumns.reduce((acc, sc) => ({ ...acc, [sc]: 'string' }), {}),
        ...dateColumns.reduce((acc, dc) => ({ ...acc, [dc]: 'date' }), {}),
        ...keyColumns.reduce((acc, kc) => ({ ...acc, [kc]: 'key' }), {}),
      };

      // default is "value", otherwise use the key from the lookup
      const sortingBy = sorts[sortBy] || 'value';
      let valuesToSort: (R & { sortBy: string | number | Date })[];
      switch (sortingBy) {
        case 'string':
          valuesToSort = dataToUse.map((t) => {
            const sortKey = sortBy;
            return {
              ...t,
              sortBy: !t.data
                ? t[sortKey].toString().toLowerCase() // If we don't have data, use the value.
                : // eslint-disable-next-line max-len
                  t.data
                    .find((tp) => (tp.sortKey || tp.title) === sortKey)
                    .value.toString()
                    .toLowerCase(),
            };
          });
          break;
        case 'date':
          valuesToSort = dataToUse.map((t) => {
            const sortKey = sortBy;
            return {
              ...t,
              sortBy: !t.data
                ? new Date(t[sortBy]) // If we don't have data, use the value.
                : new Date(t.data.find((tp) => (tp.sortKey || tp.title) === sortKey || {}).value),
            };
          });
          break;
        case 'key':
          valuesToSort = dataToUse.map((t) => ({
            ...t,
            sortBy: t.sortKey,
          }));
          break;
        default:
          valuesToSort = dataToUse.map((t) => {
            const sortKey = sortBy;
            return {
              ...t,
              sortBy: !t.data
                ? parseValue(t[sortKey]) // If we don't have data, use the value.
                : parseValue(
                    (t.data.find((tp) => (tp.sortKey || tp.title) === sortKey) || {}).value
                  ),
            };
          });
          break;
      }

      // Value sort.
      const sortValueA = direction === 'asc' ? 1 : -1;
      const sortValueB = direction === 'asc' ? -1 : 1;
      valuesToSort.sort((a, b) => {
        const valueA = sortingBy === 'string' ? a.sortBy.toString().toLowerCase() : a.sortBy;
        const valueB = sortingBy === 'string' ? b.sortBy.toString().toLowerCase() : b.sortBy;

        if (valueA > valueB) {
          return sortValueA;
        }
        if (valueB > valueA) {
          return sortValueB;
        }

        return 0;
      });
      setDataToUse(valuesToSort);
      setSortConfig({ sortBy, direction, activePage: 1 });
    },
    [dataToUse, dateColumns, keyColumns, setDataToUse, setSortConfig, sortConfig, stringColumns]
  );

  return {
    requestSort,
    sortConfig,
    setSortConfig,
  };
}
