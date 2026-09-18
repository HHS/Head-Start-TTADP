import React, { useCallback, useMemo } from 'react';
import AddTtaRequestButton from '../../components/AddTtaRequestButton';
import TtaRequestsTable, {
  type TtaRequestsSortableRow,
  type TtaRequestsTableRow,
} from './TtaRequestsTable';
import {
  ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA,
  type ActiveTtaRequest,
  DRAFT_STATUS,
} from './ttaRequestsPlaceholderData';

const EXPORT_FILE_NAME = 'active-tta-requests.csv';

// the widget title is an h2, so the empty state picks up at h3
const EMPTY_STATE = (
  <div className="text-center padding-10">
    <h3 className="font-serif-md text-bold margin-top-0 margin-bottom-1">
      You&apos;re all caught up!
    </h3>
    <p className="usa-prose text-center margin-top-0 margin-bottom-2">
      Would you like to begin a new TTA request?
    </p>
    <AddTtaRequestButton label="New TTA request" />
  </div>
);

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

// only the id and the column values are kept, since those are all the table sorts on
const toSortableRow = (request: ActiveTtaRequest): TtaRequestsSortableRow => ({
  id: request.id,
  [COLUMNS.REQUEST_ID]: request.requestId,
  [COLUMNS.CREATED_DATE]: request.createdDate,
  [COLUMNS.GOAL]: request.goal,
  [COLUMNS.REVIEWER]: request.reviewer,
  [COLUMNS.APPROVER]: request.approver,
  [COLUMNS.ASSIGNED_STAFF]: request.assignedStaff,
  [COLUMNS.STATUS]: request.status,
});

/*
  Every link stays inside the recipient record the table is being viewed from. The
  placeholder rows describe requests that don't exist, so linking anywhere derived
  from them lands on a recipient/region the user has no access to (a 401).

  TODO: link to the TTA request view/edit pages once they exist.
*/
const toTableData = (
  rows: TtaRequestsSortableRow[],
  recipientPath: string
): TtaRequestsTableRow[] =>
  rows.map((row) => ({
    id: row.id,
    heading: String(row[COLUMNS.REQUEST_ID]),
    isUrl: true,
    isInternalLink: true,
    link: `${recipientPath}/tta-request`,
    data: [
      { title: COLUMNS.CREATED_DATE, value: String(row[COLUMNS.CREATED_DATE]) },
      { title: COLUMNS.GOAL, value: String(row[COLUMNS.GOAL]) },
      { title: COLUMNS.REVIEWER, value: String(row[COLUMNS.REVIEWER]) },
      { title: COLUMNS.APPROVER, value: String(row[COLUMNS.APPROVER]) },
      { title: COLUMNS.ASSIGNED_STAFF, value: String(row[COLUMNS.ASSIGNED_STAFF]) },
      // only drafts are clickable, they take the creator back into the request
      row[COLUMNS.STATUS] === DRAFT_STATUS
        ? {
            title: COLUMNS.STATUS,
            value: DRAFT_STATUS,
            isUrl: true,
            isInternalLink: true,
            link: `${recipientPath}/tta-request`,
          }
        : { title: COLUMNS.STATUS, value: String(row[COLUMNS.STATUS]) },
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
  const rows = useMemo(() => ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.map(toSortableRow), []);

  const recipientPath = `/recipient-tta-records/${recipientId}/region/${regionId}`;

  const buildTableData = useCallback(
    (sortedRows: TtaRequestsSortableRow[]) => toTableData(sortedRows, recipientPath),
    [recipientPath]
  );

  return (
    <TtaRequestsTable
      title="Active TTA requests"
      sortStorageKey="active-tta-requests-table"
      exportFileName={EXPORT_FILE_NAME}
      firstHeading={COLUMNS.REQUEST_ID}
      headers={HEADERS}
      stringSortColumns={STRING_SORT_COLUMNS}
      dateSortColumns={DATE_SORT_COLUMNS}
      defaultSortConfig={DEFAULT_SORT_CONFIG}
      rows={rows}
      toTableData={buildTableData}
      emptyState={EMPTY_STATE}
      // Status stays frozen to the right as the table scrolls horizontally
      stickyLastDataColumn
    />
  );
}
