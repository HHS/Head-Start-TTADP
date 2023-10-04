import { useMemo } from 'react';

export default function useQueryStringFromSortConfig(sortConfig) {
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
      limit: perPage,
    });
    return queryString.toString();
  }, [sortConfig]);
}
