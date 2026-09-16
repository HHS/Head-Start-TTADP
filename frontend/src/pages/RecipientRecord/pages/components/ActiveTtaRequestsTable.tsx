import React, { useEffect, useMemo, useState } from 'react';
import WidgetContainer from '../../../../components/WidgetContainer';
import useWidgetExport from '../../../../hooks/useWidgetExport';
import useWidgetSorting, { parseValue } from '../../../../hooks/useWidgetSorting';
import HorizontalTableWidget from '../../../../widgets/HorizontalTableWidget';
import './ActiveTtaRequestsTable.css';
import {
  ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA,
  type ActiveTtaRequest,
  DRAFT_STATUS,
} from './activeTtaRequestsPlaceholderData';

const PER_PAGE = 10;
const EXPORT_FILE_NAME = 'active-tta-requests.csv';

// this table has no row checkboxes, so there is never a subset to export
const NO_CHECKBOXES = {};

export const COLUMNS = {
  REQUEST_ID: 'Request ID',
  CREATED_DATE: 'Created date',
  GOAL: 'Goal',
  REVIEWER: 'Reviewer',
  APPROVER: 'Approver',
  ASSIGNED_STAFF: 'Assigned staff',
  STATUS: 'Status',
};

// "Request ID" is rendered by the table as the first column, so it isn't in `headers`.
const HEADERS = [
  COLUMNS.CREATED_DATE,
  COLUMNS.GOAL,
  COLUMNS.REVIEWER,
  COLUMNS.APPROVER,
  COLUMNS.ASSIGNED_STAFF,
  COLUMNS.STATUS,
];

const STRING_SORT_COLUMNS = [
  COLUMNS.REQUEST_ID,
  COLUMNS.GOAL,
  COLUMNS.REVIEWER,
  COLUMNS.APPROVER,
  COLUMNS.ASSIGNED_STAFF,
  COLUMNS.STATUS,
];

const DATE_SORT_COLUMNS = [COLUMNS.CREATED_DATE];

const DEFAULT_SORT_CONFIG = {
  sortBy: COLUMNS.CREATED_DATE,
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

type SortConfig = {
  sortBy: string;
  direction: string;
  activePage?: number;
  offset?: number;
};

// A row keyed by column display name, which is what `useWidgetSorting` sorts on.
type SortableRow = ActiveTtaRequest & Record<string, string | number>;

const toSortableRow = (request: ActiveTtaRequest): SortableRow => ({
  ...request,
  [COLUMNS.REQUEST_ID]: request.requestId,
  [COLUMNS.CREATED_DATE]: request.createdDate,
  [COLUMNS.GOAL]: request.goal,
  [COLUMNS.REVIEWER]: request.reviewer,
  [COLUMNS.APPROVER]: request.approver,
  [COLUMNS.ASSIGNED_STAFF]: request.assignedStaff,
  [COLUMNS.STATUS]: request.status,
});

/**
 * Sorts rows the same way `useWidgetSorting` does, so that the initial render
 * (and anything restored from session storage) matches the active sort header.
 */
export const sortRows = (rows: SortableRow[], sortConfig: SortConfig): SortableRow[] => {
  const { sortBy, direction } = sortConfig;

  if (!sortBy || !rows.length) {
    return rows;
  }

  const sortValue = (row: SortableRow) => {
    if (DATE_SORT_COLUMNS.includes(sortBy)) {
      const time = new Date(row[sortBy]).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    if (STRING_SORT_COLUMNS.includes(sortBy)) {
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

/*
  Every link stays inside the recipient record the table is being viewed from. The
  placeholder rows describe requests that don't exist, so linking anywhere derived
  from them lands on a recipient/region the user has no access to (a 401).

  TODO: link to the TTA request view/edit pages once they exist.
*/
const toTableData = (rows: SortableRow[], recipientPath: string) =>
  rows.map((row) => ({
    id: row.id,
    heading: row.requestId,
    isUrl: true,
    isInternalLink: true,
    link: `${recipientPath}/tta-request`,
    data: [
      { title: COLUMNS.CREATED_DATE, value: row.createdDate },
      { title: COLUMNS.GOAL, value: row.goal },
      { title: COLUMNS.REVIEWER, value: row.reviewer },
      { title: COLUMNS.APPROVER, value: row.approver },
      { title: COLUMNS.ASSIGNED_STAFF, value: row.assignedStaff },
      // only drafts are clickable, they take the creator back into the request
      row.status === DRAFT_STATUS
        ? {
            title: COLUMNS.STATUS,
            value: row.status,
            isUrl: true,
            isInternalLink: true,
            link: `${recipientPath}/tta-request`,
          }
        : { title: COLUMNS.STATUS, value: row.status },
    ],
  }));

interface ActiveTtaRequestsTableProps {
  recipientId: string | number;
  regionId: string | number;
}

export default function ActiveTtaRequestsTable({
  recipientId,
  regionId,
}: ActiveTtaRequestsTableProps): React.ReactElement {
  // FOR FRONTEND TESTING ONLY - swap for a fetcher when the API lands.
  const requests = useMemo(() => ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.map(toSortableRow), []);

  const [sortableRows, setSortableRows] = useState<SortableRow[]>(requests);
  const [pageSize, setPageSize] = useState<number | 'all'>(PER_PAGE);

  const {
    requestSort,
    sortConfig: storedSortConfig,
    setSortConfig,
  } = useWidgetSorting(
    'active-tta-requests-table', // localStorageKey
    DEFAULT_SORT_CONFIG, // defaultSortConfig
    sortableRows, // dataToUse
    setSortableRows, // setDataToUse
    STRING_SORT_COLUMNS, // stringColumns
    DATE_SORT_COLUMNS // dateColumns
  );

  // useWidgetSorting is untyped, so narrow its config back down for use below
  const sortConfig = storedSortConfig as unknown as SortConfig;

  useEffect(() => {
    setSortableRows(sortRows(requests, sortConfig));
  }, [requests, sortConfig]);

  const recipientPath = `/recipient-tta-records/${recipientId}/region/${regionId}`;

  const tableData = useMemo(
    () => toTableData(sortableRows, recipientPath),
    [sortableRows, recipientPath]
  );

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
    setSortConfig((prev: SortConfig) => ({ ...prev, activePage: 1, offset: 0 }));
  };

  const handlePageChange = (pageNumber: number) => {
    setSortConfig((prev: SortConfig) => ({
      ...prev,
      activePage: pageNumber,
      offset: (pageNumber - 1) * effectivePerPage,
    }));
  };

  // the whole table is exported, not just the page being displayed
  const { exportRows } = useWidgetExport(
    tableData,
    HEADERS,
    NO_CHECKBOXES,
    COLUMNS.REQUEST_ID,
    EXPORT_FILE_NAME
  );

  const menuItems = useMemo(
    () => (tableData.length ? [{ label: 'Export table', onClick: () => exportRows('all') }] : []),
    [exportRows, tableData.length]
  );

  return (
    <WidgetContainer
      title="Active TTA requests"
      className="ttahub-active-tta-requests-table maxw-widescreen"
      loading={false}
      showPagingTop={tableData.length > 0}
      showPagingBottom={tableData.length > 0}
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
      titleGroupClassNames="padding-x-3 padding-top-3 position-relative"
    >
      <HorizontalTableWidget
        headers={HEADERS}
        data={paginatedTableData}
        firstHeading={COLUMNS.REQUEST_ID}
        caption="Active TTA requests"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
        showTotalColumn={false}
        stickyLastColumn={false}
        // Status stays frozen to the right as the table scrolls horizontally
        stickyLastDataColumn
        showDashForNullValue
      />
    </WidgetContainer>
  );
}
