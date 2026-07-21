import { useCallback } from 'react';
import { blobToCsvDownload, checkboxesToIds } from '../utils';

const CSV_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;

function formatCsvCell(value) {
  const stringValue = typeof value === 'string' ? value : String(value ?? '');
  const sanitizedValue =
    typeof value === 'string' && CSV_FORMULA_PREFIX_PATTERN.test(stringValue)
      ? `'${stringValue}`
      : stringValue;

  return /[,"\n]/.test(sanitizedValue) ? `"${sanitizedValue.replace(/"/g, '""')}"` : sanitizedValue;
}

export default function useWidgetExport(
  data,
  headers,
  checkboxes,
  exportHeading,
  exportName,
  exportDataName = null // Specify the data to export.
) {
  const exportRows = useCallback(
    (exportType) => {
      try {
        let dataToExport = data;
        if (exportType === 'selected') {
          const selectedRowsIds = checkboxesToIds(checkboxes);
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
          const dataToUse =
            (!row?.data && exportDataName ? row?.[exportDataName] : row?.data) || [];
          const rowValues = dataToUse.map((d) => {
            const rawValue = d?.value ?? '';
            return formatCsvCell(rawValue);
          });
          const heading =
            typeof row?.heading === 'string' ? row.heading : String(row?.heading ?? '');
          const rowHeadingToUse = formatCsvCell(heading);
          return `${rowHeadingToUse},${rowValues.join(',')}`;
        });
        // Create CSV.
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        blobToCsvDownload(blob, exportName);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    },
    [checkboxes, data, exportHeading, exportName, headers, exportDataName]
  );

  return {
    exportRows,
  };
}
