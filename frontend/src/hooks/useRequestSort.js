import { useCallback } from 'react';

export default function useRequestSort(setSortConfig) {
  return useCallback((sortBy) => {
    setSortConfig((previousConfig) => {
      let direction = 'desc';
      if (previousConfig.sortBy === sortBy && previousConfig.direction === 'desc') {
        direction = 'asc';
      }

      setSortConfig({
        ...previousConfig,
        sortBy,
        direction,
      });
    });
  }, [setSortConfig]);
}
