import { useCallback } from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import useSessionSort from './useSessionSort';

export const parseValue = (value) => {
  const noCommasValue = String(value).replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};

export default function useWidgetSorting(
  localStorageKey,
  defaultSortConfig,
  dataToUse,
  setDataToUse,
  stringColumns = [],
  dateColumns = [],
  keyColumns = [],
) {
  const [sortConfig, setSortConfig] = useSessionSort(defaultSortConfig, localStorageKey);

  const requestSort = useCallback((sortBy) => {
    // Get sort direction.
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    // make a lookup object with our columns and their types.
    const sorts = {
      ...stringColumns.reduce((acc, sc) => ({ ...acc, [sc]: 'string' }), {}),
      ...dateColumns.reduce((acc, dc) => ({ ...acc, [dc]: 'date' }), {}),
      ...keyColumns.reduce((acc, kc) => ({ ...acc, [kc]: 'key' }), {}),
    };

    // default is "value", otherwise use the key from the lookup
    const sortingBy = sorts[sortBy] || 'value';

    let valuesToSort;
    switch (sortingBy) {
      case 'string':
        valuesToSort = dataToUse.map((t) => ({
          ...t,
          sortBy: t.heading,
        }));
        break;
      case 'date':
        valuesToSort = dataToUse.map((t) => (
          {
            ...t,
            sortBy: new Date(t.data.find((tp) => (tp.sortKey || tp.title) === sortBy).value),
          }));
        break;
      case 'key':
        valuesToSort = dataToUse.map((t) => ({
          ...t,
          sortBy: t.sortKey,
        }));
        break;
      default:
        // Sort by value.
        valuesToSort = dataToUse.map((t) => (
          {
            ...t,
            sortBy: parseValue(t.data.find((tp) => (tp.sortKey || tp.title) === sortBy).value),
          }));
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
      } if (valueB > valueA) {
        return sortValueB;
      }

      return 0;
    });
    setDataToUse(valuesToSort);
    setSortConfig({ sortBy, direction, activePage: 1 });
  }, [dataToUse, dateColumns, keyColumns, setDataToUse, setSortConfig, sortConfig, stringColumns]);

  return {
    requestSort,
    sortConfig,
    setSortConfig,
  };
}
