import { useEffect, useState } from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import useSessionSort from './useSessionSort';

export const parseValue = (value) => {
  const noCommasValue = value.replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};

export default function useWidgetPaging(
  headers,
  localStorageKey,
  defaultSortConfig,
  perPageNumber,
  dataToUse,
  setDataToUse,
  resetPagination,
  setResetPagination,
  loading,
  checkBoxes,
  exportHeading,
  setDataPerPage,
  stringColumns = [],
  dateColumns = [],
  exportName,
) {
  const [sortConfig, setSortConfig] = useSessionSort(defaultSortConfig, localStorageKey);
  const { activePage } = sortConfig;
  const [offset, setOffset] = useState((activePage - 1) * perPageNumber);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig({ ...sortConfig, activePage: 1 });
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [activePage, resetPagination, setResetPagination, setSortConfig, sortConfig]);

  const handlePageChange = (pageNumber) => {
    if (!loading) {
      // copy state
      const sort = { ...sortConfig };

      // mutate
      sort.activePage = pageNumber;

      // store it
      setSortConfig(sort);
      setOffset((pageNumber - 1) * perPageNumber);
    }
  };

  const requestSort = (sortBy) => {
    // Get sort direction.
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    const sortingByStringColumn = stringColumns.includes(sortBy);
    const sortingByDateColumn = dateColumns.includes(sortBy);

    // Set the value we want to sort by.
    let valuesToSort;
    if (sortingByStringColumn) {
      // Sort by string.
      valuesToSort = dataToUse.map((t) => ({
        ...t,
        sortBy: t.heading,
      }));
    } else if (sortingByDateColumn) {
      // Sort by date.
      valuesToSort = dataToUse.map((t) => (
        {
          ...t,
          sortBy: new Date(t.data.find((tp) => tp.title === sortBy).value),
        }));
    } else {
      // Sort by value.
      valuesToSort = dataToUse.map((t) => (
        {
          ...t,
          sortBy: parseValue(t.data.find((tp) => tp.title === sortBy).value),
        }));
    }

    // Value sort.
    const sortValueA = direction === 'asc' ? 1 : -1;
    const sortValueB = direction === 'asc' ? -1 : 1;
    valuesToSort.sort((a, b) => {
      const valueA = sortingByStringColumn ? a.sortBy.toString().toLowerCase() : a.sortBy;
      const valueB = sortingByStringColumn ? b.sortBy.toString().toLowerCase() : b.sortBy;

      if (valueA > valueB) {
        return sortValueA;
      } if (valueB > valueA) {
        return sortValueB;
      }

      return 0;
    });
    setDataToUse(valuesToSort);
    setOffset(0);
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  const exportRows = (exportType) => {
    let url = null;
    try {
      let dataToExport = dataToUse;
      if (exportType === 'selected') {
      // Get all the ids of the rowsToExport that have a value of true.
        const selectedRowsStrings = Object.keys(checkBoxes).filter((key) => checkBoxes[key]);
        // Loop all selected rows and parseInt to an array of integers.
        const selectedRowsIds = selectedRowsStrings.map((s) => parseInt(s, DECIMAL_BASE));
        // Filter the recipients to export to only include the selected rows.
        dataToExport = dataToUse.filter((row) => selectedRowsIds.includes(row.id));
      }

      // Create data array if its missing (headers array must be populated correctly).
      const createMissingData = dataToExport.every((d) => !d.data);
      if (createMissingData) {
        dataToExport = dataToExport.map((d) => ({
          ...d,
          heading: d.name,
          data: Object.keys(d)
            .filter((key) => headers.includes(key))
            .map((key) => ({
              title: key,
              value: d[key].toString().replace(/,/g, ''),
            })),
        }));
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
  };

  useEffect(() => {
    setDataPerPage(dataToUse.slice(offset, offset + perPageNumber));
  }, [offset, perPageNumber, dataToUse, setDataPerPage]);

  return {
    offset,
    activePage,
    handlePageChange,
    requestSort,
    exportRows,
    sortConfig,
  };
}
