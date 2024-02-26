import { useCallback } from 'react';

/**
 *
 * @param {fn} onUpdateFilter
 * @returns fn
 */
export default function useGaDataLayerFilterItem(id, onUpdateFilter) {
  return useCallback((name, value) => {
    window.dataLayer.push({
      event: 'filterSelection',
      filterValue: value,
      filterName: name,
    });

    onUpdateFilter(id, name, value);
  }, [id, onUpdateFilter]);
}
