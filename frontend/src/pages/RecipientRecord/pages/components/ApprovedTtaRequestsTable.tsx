import React, { useCallback, useMemo } from 'react';
import TtaRequestsTable, {
  type TtaRequestsSortableRow,
  type TtaRequestsTableRow,
} from './TtaRequestsTable';
import {
  APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA,
  type ApprovedTtaRequest,
} from './ttaRequestsPlaceholderData';

const EXPORT_FILE_NAME = 'approved-tta-requests.csv';

export const COLUMNS = {
  REQUEST_ID: 'Request ID',
  APPROVED_DATE: 'Approved date',
  CREATOR: 'Creator',
  ASSIGNED_STAFF: 'Assigned staff',
  GOAL: 'Goal',
};

// "Request ID" is rendered by the table as the first column, so it isn't in `headers`.
const HEADERS = [COLUMNS.APPROVED_DATE, COLUMNS.CREATOR, COLUMNS.ASSIGNED_STAFF, COLUMNS.GOAL];

const STRING_SORT_COLUMNS = [
  COLUMNS.REQUEST_ID,
  COLUMNS.CREATOR,
  COLUMNS.ASSIGNED_STAFF,
  COLUMNS.GOAL,
];

const DATE_SORT_COLUMNS = [COLUMNS.APPROVED_DATE];

const DEFAULT_SORT_CONFIG = {
  sortBy: COLUMNS.APPROVED_DATE,
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

// a request can be assigned to several people, who are listed one per line
const staffToValue = (assignedStaff: string[]) => assignedStaff.join('\n');

// only the id and the column values are kept, since those are all the table sorts on
const toSortableRow = (request: ApprovedTtaRequest): TtaRequestsSortableRow => ({
  id: request.id,
  [COLUMNS.REQUEST_ID]: request.requestId,
  [COLUMNS.APPROVED_DATE]: request.approvedDate,
  [COLUMNS.CREATOR]: request.creator,
  [COLUMNS.ASSIGNED_STAFF]: staffToValue(request.assignedStaff),
  [COLUMNS.GOAL]: request.goal,
});

// see the note in ActiveTtaRequestsTable about where these links point
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
      { title: COLUMNS.APPROVED_DATE, value: String(row[COLUMNS.APPROVED_DATE]) },
      { title: COLUMNS.CREATOR, value: String(row[COLUMNS.CREATOR]) },
      {
        title: COLUMNS.ASSIGNED_STAFF,
        value: String(row[COLUMNS.ASSIGNED_STAFF]),
        className: 'ttahub-tta-requests-table--multiline',
      },
      { title: COLUMNS.GOAL, value: String(row[COLUMNS.GOAL]) },
    ],
  }));

interface ApprovedTtaRequestsTableProps {
  recipientId: string | number;
  regionId: string | number;
}

export default function ApprovedTtaRequestsTable({
  recipientId,
  regionId,
}: ApprovedTtaRequestsTableProps): React.ReactElement {
  // FOR FRONTEND TESTING ONLY - swap for a fetcher when the API lands.
  const rows = useMemo(() => APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA.map(toSortableRow), []);

  const recipientPath = `/recipient-tta-records/${recipientId}/region/${regionId}`;

  const buildTableData = useCallback(
    (sortedRows: TtaRequestsSortableRow[]) => toTableData(sortedRows, recipientPath),
    [recipientPath]
  );

  return (
    <TtaRequestsTable
      title="Approved TTA requests"
      sortStorageKey="approved-tta-requests-table"
      exportFileName={EXPORT_FILE_NAME}
      firstHeading={COLUMNS.REQUEST_ID}
      headers={HEADERS}
      stringSortColumns={STRING_SORT_COLUMNS}
      dateSortColumns={DATE_SORT_COLUMNS}
      defaultSortConfig={DEFAULT_SORT_CONFIG}
      rows={rows}
      toTableData={buildTableData}
    />
  );
}
