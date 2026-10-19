import React, { useEffect, useMemo, useState } from 'react';
import useWidgetPaging from '../../hooks/useWidgetPaging';
import type { WidgetSortConfig } from '../../hooks/useWidgetSorting';
import HorizontalTableWidget from '../../widgets/HorizontalTableWidget';
import WidgetContainer from '../WidgetContainer';
import './TtaRequestsTable.css';

export const PER_PAGE = 10;

/** the recipient record a request's recipient column links to - profile is its first tab */
export const recipientRecordUrl = (recipientId: number, regionId: number) =>
  `/recipient-tta-records/${recipientId}/region/${regionId}/profile`;

// these tables have no row checkboxes, so there is never a subset to export
const NO_CHECKBOXES = {};

export interface TtaRequestsTableCell {
  title: string;
  value: string;
  className?: string;
  isUrl?: boolean;
  isInternalLink?: boolean;
  link?: string;
}

export interface TtaRequestsTableRow {
  id: number;
  heading: string;
  /** the first column is the row heading rather than a cell, so it sorts on this */
  sortKey: string;
  isUrl: boolean;
  isInternalLink: boolean;
  link: string;
  data: TtaRequestsTableCell[];
}

interface TtaRequestsTableProps {
  title: string;
  /** where this table's sort is stashed in session storage */
  sortStorageKey: string;
  exportFileName: string;
  firstHeading: string;
  headers: string[];
  stringSortColumns: string[];
  dateSortColumns: string[];
  defaultSortConfig: WidgetSortConfig;
  rows: TtaRequestsTableRow[];
  /** while the rows are still being fetched */
  loading?: boolean;
  /** shown in place of the table when there is nothing to list */
  emptyState: React.ReactElement;
  /** shown in place of the table when the rows couldn't be fetched */
  error?: string;
  /** freezes the final column against the right edge as the table scrolls */
  stickyLastDataColumn?: boolean;
}

/**
 * The shell shared by the TTA requests tables: sorting, pagination, the per page
 * select and the actions menu. Each table supplies its own columns and cells.
 */
export default function TtaRequestsTable({
  title,
  sortStorageKey,
  exportFileName,
  firstHeading,
  headers,
  stringSortColumns,
  dateSortColumns,
  defaultSortConfig,
  rows,
  loading = false,
  emptyState,
  error = '',
  stickyLastDataColumn = false,
}: TtaRequestsTableProps): React.ReactElement {
  const [tableData, setTableData] = useState<TtaRequestsTableRow[]>(rows);
  const [rowsToDisplay, setRowsToDisplay] = useState<TtaRequestsTableRow[]>([]);
  const [pageSize, setPageSize] = useState<number | 'all'>(PER_PAGE);
  const [resetPagination, setResetPagination] = useState(false);
  const [sortNeeded, setSortNeeded] = useState(true);

  const isEmpty = tableData.length === 0;
  // "all" shows everything on a single page, so the page is as long as the table
  const perPage = pageSize === 'all' ? Math.max(tableData.length, 1) : pageSize;

  const { offset, activePage, handlePageChange, requestSort, exportRows, sortConfig } =
    useWidgetPaging(
      headers,
      sortStorageKey,
      defaultSortConfig,
      perPage,
      tableData, // dataToUse
      setTableData,
      resetPagination,
      setResetPagination,
      loading,
      NO_CHECKBOXES,
      firstHeading, // export heading
      setRowsToDisplay,
      stringSortColumns,
      dateSortColumns,
      exportFileName,
      null, // exportDataName
      [firstHeading] // the first column sorts on the row's sortKey, not a cell
    );

  useEffect(() => {
    setTableData(rows);
    setSortNeeded(true);
  }, [rows]);

  // rows only get sorted on request, so the active sort is applied to new rows here
  useEffect(() => {
    if (!sortNeeded || !tableData.length) {
      return;
    }

    setSortNeeded(false);
    requestSort(sortConfig.sortBy, sortConfig.direction);
  }, [requestSort, sortConfig, sortNeeded, tableData]);

  const handlePerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPageSize =
      event.target.value === 'all' ? 'all' : Number.parseInt(event.target.value, 10);

    if (nextPageSize !== 'all' && (!Number.isInteger(nextPageSize) || nextPageSize < 1)) {
      return;
    }

    setPageSize(nextPageSize);
    setResetPagination(true);
  };

  /*
    The per page select sits below the title, so when it goes away with the table
    the title group needs to supply that bottom padding itself.
  */
  const titleGroupClassNames = `padding-x-3 padding-top-3 position-relative ${isEmpty ? 'padding-bottom-3' : ''}`;

  const menuItems = useMemo(
    () => (isEmpty ? [] : [{ label: 'Export table', onClick: () => exportRows('all') }]),
    [exportRows, isEmpty]
  );

  return (
    <WidgetContainer
      title={title}
      className="ttahub-tta-requests-table maxw-widescreen"
      loading={loading}
      error={error || null}
      showPagingTop={!isEmpty}
      showPagingBottom={!isEmpty}
      currentPage={activePage}
      totalCount={tableData.length}
      offset={offset}
      perPage={perPage}
      handlePageChange={handlePageChange}
      paginationCardTopProps={{
        perPageChange: handlePerPageChange,
        noXofX: true,
        perPageSelectValue: pageSize,
        allOptionValue: 'all',
        hidePagination: true,
        className: 'margin-bottom-2',
      }}
      menuItems={menuItems}
      titleMargin={{ bottom: 1 }}
      titleGroupClassNames={titleGroupClassNames}
    >
      {/* a failed fetch isn't an empty list, so it doesn't claim there's nothing to do */}
      {error ? null : isEmpty ? (
        emptyState
      ) : (
        <HorizontalTableWidget
          headers={headers}
          data={rowsToDisplay}
          firstHeading={firstHeading}
          caption={title}
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          showTotalColumn={false}
          stickyLastColumn={false}
          stickyLastDataColumn={stickyLastDataColumn}
          showDashForNullValue
        />
      )}
    </WidgetContainer>
  );
}
