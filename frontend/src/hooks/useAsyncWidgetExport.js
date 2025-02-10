import { useCallback } from 'react';
import { IS } from '../Constants';
import { blobToCsvDownload, checkboxesToIds } from '../utils';

/*
export const getCommunicationLogs = async (
  sortBy, direction, offset, limit = 10, filters = [], format = 'json',
) => {
*/

export default function useAsyncWidgetExport(
  checkboxes,
  exportName,
  sortConfig,
  fetcher,
) {
  const exportRows = useCallback(async (exportType) => {
    const filters = [];

    if (exportType === 'selected') {
      const selectedRowsIds = checkboxesToIds(checkboxes);
      // Filter the recipients to export to only include the selected rows.
      filters.push({
        topic: 'id',
        condition: IS,
        query: selectedRowsIds,
      });
    }

    try {
      const blob = await fetcher(
        sortConfig.sortBy,
        sortConfig.direction,
        0,
        false,
        filters,
        'csv',
      );
      blobToCsvDownload(blob, exportName);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, [checkboxes, exportName, fetcher, sortConfig.direction, sortConfig.sortBy]);

  return {
    exportRows,
  };
}
