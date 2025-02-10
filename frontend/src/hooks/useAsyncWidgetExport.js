import { useCallback } from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import { IS } from '../Constants';

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
      const selectedRowsStrings = Object.keys(checkboxes).filter((key) => checkboxes[key]);
      // Loop all selected rows and parseInt to an array of integers.
      // If the ID isn't a number, keep it as a string.
      const selectedRowsIds = selectedRowsStrings.map((s) => {
        const parsedInt = parseInt(s, DECIMAL_BASE);
        return s.includes('-') ? s : parsedInt;
      });
      // Filter the recipients to export to only include the selected rows.
      filters.push({
        topic: 'id',
        condition: IS,
        query: selectedRowsIds,
      });
    }

    let url = null;

    try {
      const logs = await fetcher(
        sortConfig.sortBy,
        sortConfig.direction,
        0,
        false,
        filters,
        'csv',
      );
      url = window.URL.createObjectURL(logs);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', exportName);
      document.body.appendChild(a);
      a.click();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      window.URL.revokeObjectURL(url);
    }
  }, [checkboxes, exportName, fetcher, sortConfig.direction, sortConfig.sortBy]);

  return {
    exportRows,
  };
}
