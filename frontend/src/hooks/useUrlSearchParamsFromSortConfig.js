import { useMemo } from 'react';

export default function useUrlSearchParamsFromSortConfig(sortConfig, useLimit = true) {
  return useMemo(() => {
    const {
      sortBy,
      direction,
      offset,
      perPage,
    } = sortConfig;
    const queryString = new URLSearchParams({
      sortBy,
      sortDir: direction,
      offset,
    });

    if (!useLimit) {
      queryString.set('limit', 'false');
    }

    if (perPage && useLimit) {
      queryString.set('limit', perPage);
    }

    return queryString;
  }, [sortConfig, useLimit]);
}
