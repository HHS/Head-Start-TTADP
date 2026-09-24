import { DECIMAL_BASE } from '@ttahub/common';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';
import useWidgetExport from './useWidgetExport';
import useWidgetSorting, {
  type SortDirection,
  type WidgetSortableRow,
  type WidgetSortConfig,
} from './useWidgetSorting';

export const parseValue = (value: string): string | number => {
  const noCommasValue = value.replaceAll(',', '');
  const parsedValue = parseInt(noCommasValue, DECIMAL_BASE);
  if (Number.isNaN(parsedValue)) {
    return value;
  }
  return parsedValue;
};

export interface UseWidgetPaging {
  offset: number;
  activePage: number;
  handlePageChange: (pageNumber: number) => void;
  requestSort: (sortBy: string, direction?: SortDirection) => void;
  exportRows: (exportType?: 'selected' | 'all') => void;
  sortConfig: WidgetSortConfig;
  setSortConfig: Dispatch<SetStateAction<WidgetSortConfig>>;
}

export default function useWidgetPaging<R extends WidgetSortableRow>(
  headers: string[],
  localStorageKey: string,
  defaultSortConfig: WidgetSortConfig,
  perPageNumber: number,
  dataToUse: R[],
  setDataToUse: (data: R[]) => void,
  resetPagination: boolean,
  setResetPagination: (resetPagination: boolean) => void,
  loading: boolean,
  checkBoxes: Record<string | number, boolean>,
  exportHeading: string,
  setDataPerPage: (data: R[]) => void,
  stringColumns: string[] = [],
  dateColumns: string[] = [],
  exportName?: string,
  exportDataName: string | null = null,
  keyColumns: string[] = []
): UseWidgetPaging {
  const { sortConfig, setSortConfig, requestSort } = useWidgetSorting(
    localStorageKey,
    defaultSortConfig,
    dataToUse,
    setDataToUse,
    stringColumns,
    dateColumns,
    keyColumns
  );

  const { exportRows } = useWidgetExport(
    dataToUse,
    headers,
    checkBoxes,
    exportHeading,
    exportName,
    exportDataName
  );

  const { activePage } = sortConfig;
  const [offset, setOffset] = useState((activePage - 1) * perPageNumber);

  // a side effect that resets the pagination when the filters change
  useEffect(() => {
    if (resetPagination) {
      setSortConfig((prevSortConfig) => ({ ...prevSortConfig, activePage: 1 }));
      setOffset(0); // 0 times perpage = 0
      setResetPagination(false);
    }
  }, [resetPagination, setResetPagination, setSortConfig]);

  useEffect(() => {
    setDataPerPage(dataToUse.slice(offset, offset + perPageNumber));
  }, [offset, perPageNumber, dataToUse, setDataPerPage]);

  const handlePageChange = useCallback(
    (pageNumber: number) => {
      if (!loading) {
        // copy state
        const sort = { ...sortConfig };

        // mutate
        sort.activePage = pageNumber;

        // store it
        setSortConfig(sort);
        setOffset((pageNumber - 1) * perPageNumber);
      }
    },
    [loading, perPageNumber, setSortConfig, sortConfig]
  );

  const sort = useCallback(
    (sortBy: string, direction?: SortDirection) => {
      requestSort(sortBy, direction);
      setOffset(0);
    },
    [requestSort]
  );

  useEffect(() => {
    setDataPerPage(dataToUse.slice(offset, offset + perPageNumber));
  }, [offset, perPageNumber, dataToUse, setDataPerPage]);

  return {
    offset,
    activePage,
    handlePageChange,
    requestSort: sort,
    exportRows,
    sortConfig,
    setSortConfig,
  };
}
