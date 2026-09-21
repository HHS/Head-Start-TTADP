import React, { useEffect, useMemo, useState } from 'react';
import WidgetContainer from '../../../../components/WidgetContainer';
import useWidgetPaging from '../../../../hooks/useWidgetPaging';
import type { WidgetSortConfig } from '../../../../hooks/useWidgetSorting';
import HorizontalTableWidget from '../../../../widgets/HorizontalTableWidget';
import './TtaRequestsTable.css';

export const PER_PAGE = 10;

// these tables have no row checkboxes, so there is never a subset to export
const NO_CHECKBOXES = {};

/*
  FOR FRONTEND TESTING ONLY - the rows the table falls back to while the empty
  state toggle is on. Declared at module scope so the reference stays stable
  between renders. Remove it (with the toggle below) once the tables are wired
  up to a fetcher and the placeholder data is gone.
*/
const NO_ROWS: TtaRequestsTableRow[] = [];

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
  /** shown in place of the table when there is nothing to list */
  emptyState: React.ReactElement;
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
  emptyState,
  stickyLastDataColumn = false,
}: TtaRequestsTableProps): React.ReactElement {
  const [tableData, setTableData] = useState<TtaRequestsTableRow[]>(rows);
  const [rowsToDisplay, setRowsToDisplay] = useState<TtaRequestsTableRow[]>([]);
  const [pageSize, setPageSize] = useState<number | 'all'>(PER_PAGE);
  const [resetPagination, setResetPagination] = useState(false);
  const [sortNeeded, setSortNeeded] = useState(true);
  // FOR FRONTEND TESTING ONLY - see the toggle rendered above the table below
  const [showEmptyState, setShowEmptyState] = useState(false);

  const displayedRows = showEmptyState ? NO_ROWS : rows;

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
      false, // loading
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
    setTableData(displayedRows);
    setSortNeeded(true);
  }, [displayedRows]);

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
    FOR FRONTEND TESTING ONLY - there is no backend yet, so the link above the
    table is the only way to see how it renders with nothing in it. Remove it
    along with the placeholder data once the tables use a fetcher.
  */
  const toggleEmptyState = () => {
    setShowEmptyState((current) => !current);
    setResetPagination(true);
  };

  const emptyStateToggle = (
    <div className="margin-bottom-1">
      <button
        type="button"
        className="usa-button usa-button--unstyled font-sans-3xs"
        onClick={toggleEmptyState}
      >
        {showEmptyState ? 'Show placeholder data' : 'Show empty state'}
      </button>
    </div>
  );

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
    <>
      {emptyStateToggle}
      <WidgetContainer
        title={title}
        className="ttahub-tta-requests-table maxw-widescreen"
        loading={false}
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
        {isEmpty ? (
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
    </>
  );
}
