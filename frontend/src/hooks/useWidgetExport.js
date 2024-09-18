import { useCallback } from 'react';
import { DECIMAL_BASE } from '@ttahub/common';

export default function useWidgetExport(
  data,
  headers,
  checkboxes,
  exportHeading,
  exportName,
) {
  const exportRows = useCallback((exportType) => {
    let url = null;
    try {
      let dataToExport = data;
      if (exportType === 'selected') {
        // Get all the ids of the rowsToExport that have a value of true.
        const selectedRowsStrings = Object.keys(checkboxes).filter((key) => checkboxes[key]);
        // Loop all selected rows and parseInt to an array of integers.
        const selectedRowsIds = selectedRowsStrings.map((s) => parseInt(s, DECIMAL_BASE));
        // Filter the recipients to export to only include the selected rows.
        dataToExport = data.filter((row) => selectedRowsIds.includes(row.id));
      }

      // Create a header row.
      const headerData = headers.map((h) => ({ title: h, value: h }));
      dataToExport = [
        {
          heading: exportHeading,
          data: headerData,
        },
        ...dataToExport,
      ];

      // create a csv file of all the rows.
      const csvRows = dataToExport.map((row) => {
        const rowValues = row.data.map((d) => d.value);
        // If the heading has a comma, wrap it in quotes.
        const rowHeadingToUse = row.heading.includes(',') ? `"${row.heading}"` : row.heading;
        return `${rowHeadingToUse},${rowValues.join(',')}`;
      });
      // Create CSV.
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });

      // Check if url exists with the attribute of download.
      if (document.getElementsByName('download').length > 0) {
        document.getElementsByName('download')[0].remove();
      }
      url = window.URL.createObjectURL(blob);
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
  }, [checkboxes, data, exportHeading, exportName, headers]);

  return exportRows;
}
