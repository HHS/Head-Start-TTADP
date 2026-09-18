import React, { useEffect, useMemo, useState } from 'react';
import WidgetContainer from '../../../../components/WidgetContainer';
import useWidgetExport from '../../../../hooks/useWidgetExport';
import useWidgetSorting, { parseValue } from '../../../../hooks/useWidgetSorting';
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
const NO_ROWS: TtaRequestsSortableRow[] = [];

export type TtaRequestsSortConfig = {
  sortBy: string;
  direction: string;
  activePage?: number;
  offset?: number;
};

/** A row keyed by column display name, which is what `useWidgetSorting` sorts on. */
export type TtaRequestsSortableRow = { id: number } & Record<string, string | number>;

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
  isUrl: boolean;
  isInternalLink: boolean;
  link: string;
  data: TtaRequestsTableCell[];
}

/**
 * Sorts rows the same way `useWidgetSorting` does, so that the initial render
 * (and anything restored from session storage) matches the active sort header.
 */
export const sortRows = (
  rows: TtaRequestsSortableRow[],
  sortConfig: TtaRequestsSortConfig,
  stringSortColumns: string[],
  dateSortColumns: string[]
): TtaRequestsSortableRow[] => {
  const { sortBy, direction } = sortConfig;

  if (!sortBy || !rows.length) {
    return rows;
  }

  const sortValue = (row: TtaRequestsSortableRow) => {
    if (dateSortColumns.includes(sortBy)) {
      const time = new Date(row[sortBy]).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    if (stringSortColumns.includes(sortBy)) {
      return String(row[sortBy]).toLowerCase();
    }

    return parseValue(row[sortBy]);
  };

  const ascending = direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const valueA = sortValue(a);
    const valueB = sortValue(b);

    if (valueA > valueB) {
      return ascending;
    }

    if (valueB > valueA) {
      return -ascending;
    }

    return 0;
  });
};

interface TtaRequestsTableProps {
  title: string;
  /** where this table's sort is stashed in session storage */
  sortStorageKey: string;
  exportFileName: string;
  firstHeading: string;
  headers: string[];
  stringSortColumns: string[];
  dateSortColumns: string[];
  defaultSortConfig: TtaRequestsSortConfig;
  rows: TtaRequestsSortableRow[];
  toTableData: (rows: TtaRequestsSortableRow[]) => TtaRequestsTableRow[];
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
  toTableData,
  emptyState,
  stickyLastDataColumn = false,
}: TtaRequestsTableProps): React.ReactElement {
  const [sortableRows, setSortableRows] = useState<TtaRequestsSortableRow[]>(rows);
  const [pageSize, setPageSize] = useState<number | 'all'>(PER_PAGE);
  // FOR FRONTEND TESTING ONLY - see the toggle rendered in the title below
  const [showEmptyState, setShowEmptyState] = useState(false);

  const displayedRows = showEmptyState ? NO_ROWS : rows;

  const {
    requestSort,
    sortConfig: storedSortConfig,
    setSortConfig,
  } = useWidgetSorting(
    sortStorageKey, // localStorageKey
    defaultSortConfig, // defaultSortConfig
    sortableRows, // dataToUse
    setSortableRows, // setDataToUse
    stringSortColumns, // stringColumns
    dateSortColumns // dateColumns
  );

  // useWidgetSorting is untyped, so narrow its config back down for use below
  const sortConfig = storedSortConfig as unknown as TtaRequestsSortConfig;

  useEffect(() => {
    setSortableRows(sortRows(displayedRows, sortConfig, stringSortColumns, dateSortColumns));
  }, [displayedRows, sortConfig, stringSortColumns, dateSortColumns]);

  const tableData = useMemo(() => toTableData(sortableRows), [sortableRows, toTableData]);

  const isEmpty = tableData.length === 0;
  const currentPage = sortConfig.activePage || 1;
  const currentOffset = sortConfig.offset || 0;
  const effectivePerPage = pageSize === 'all' ? Math.max(tableData.length, 1) : pageSize;

  const paginatedTableData = useMemo(
    () => tableData.slice(currentOffset, currentOffset + effectivePerPage),
    [tableData, currentOffset, effectivePerPage]
  );

  const handlePerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPageSize =
      event.target.value === 'all' ? 'all' : Number.parseInt(event.target.value, 10);

    if (nextPageSize !== 'all' && (!Number.isInteger(nextPageSize) || nextPageSize < 1)) {
      return;
    }

    setPageSize(nextPageSize);
    setSortConfig((prev: TtaRequestsSortConfig) => ({ ...prev, activePage: 1, offset: 0 }));
  };

  const handlePageChange = (pageNumber: number) => {
    setSortConfig((prev: TtaRequestsSortConfig) => ({
      ...prev,
      activePage: pageNumber,
      offset: (pageNumber - 1) * effectivePerPage,
    }));
  };

  /*
    FOR FRONTEND TESTING ONLY - there is no backend yet, so the link above the
    table is the only way to see how it renders with nothing in it. Remove it
    along with the placeholder data once the tables use a fetcher.
  */
  const toggleEmptyState = () => {
    setShowEmptyState((current) => !current);
    setSortConfig((prev: TtaRequestsSortConfig) => ({ ...prev, activePage: 1, offset: 0 }));
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

  // the whole table is exported, not just the page being displayed
  const { exportRows } = useWidgetExport(
    tableData,
    headers,
    NO_CHECKBOXES,
    firstHeading,
    exportFileName
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
        currentPage={currentPage}
        totalCount={tableData.length}
        offset={currentOffset}
        perPage={effectivePerPage}
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
            data={paginatedTableData}
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
