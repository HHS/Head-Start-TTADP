import React, { useMemo } from 'react';
import type { WidgetSortConfig } from '../../../../hooks/useWidgetSorting';
import TtaRequestsTable, { type TtaRequestsTableRow } from './TtaRequestsTable';
import {
  APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA,
  type ApprovedTtaRequest,
} from './ttaRequestsPlaceholderData';

const EXPORT_FILE_NAME = 'approved-tta-requests.csv';

const EMPTY_STATE = (
  <p className="font-serif-md margin-0 padding-10 text-bold text-center">
    You have no approved TTA requests.
  </p>
);

export const COLUMNS = {
  REQUEST_ID: 'Request ID',
  APPROVED_DATE: 'Approved date',
  CREATOR: 'Creator',
  ASSIGNED_STAFF: 'Assigned staff',
  GOAL: 'Goal',
};

// "Request ID" is rendered by the table as the first column, so it isn't in `headers`.
const HEADERS = [COLUMNS.APPROVED_DATE, COLUMNS.CREATOR, COLUMNS.ASSIGNED_STAFF, COLUMNS.GOAL];

const STRING_SORT_COLUMNS = [COLUMNS.CREATOR, COLUMNS.ASSIGNED_STAFF, COLUMNS.GOAL];

const DATE_SORT_COLUMNS = [COLUMNS.APPROVED_DATE];

const DEFAULT_SORT_CONFIG: WidgetSortConfig = {
  sortBy: COLUMNS.APPROVED_DATE,
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

// a request can be assigned to several people, who are listed one per line
const staffToValue = (assignedStaff: string[]) => assignedStaff.join('\n');

// see the note in ActiveTtaRequestsTable about where these links point
const toTableRow = (request: ApprovedTtaRequest, recipientPath: string): TtaRequestsTableRow => ({
  id: request.id,
  heading: request.requestId,
  sortKey: request.requestId,
  isUrl: true,
  isInternalLink: true,
  link: `${recipientPath}/tta-request`,
  data: [
    { title: COLUMNS.APPROVED_DATE, value: request.approvedDate },
    { title: COLUMNS.CREATOR, value: request.creator },
    {
      title: COLUMNS.ASSIGNED_STAFF,
      value: staffToValue(request.assignedStaff),
      className: 'ttahub-tta-requests-table--multiline',
    },
    { title: COLUMNS.GOAL, value: request.goal },
  ],
});

interface ApprovedTtaRequestsTableProps {
  recipientId: string | number;
  regionId: string | number;
}

export default function ApprovedTtaRequestsTable({
  recipientId,
  regionId,
}: ApprovedTtaRequestsTableProps): React.ReactElement {
  const recipientPath = `/recipient-tta-records/${recipientId}/region/${regionId}`;

  // FOR FRONTEND TESTING ONLY - swap for a fetcher when the API lands.
  const rows = useMemo(
    () =>
      APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA.map((request) => toTableRow(request, recipientPath)),
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
      emptyState={EMPTY_STATE}
    />
  );
}
