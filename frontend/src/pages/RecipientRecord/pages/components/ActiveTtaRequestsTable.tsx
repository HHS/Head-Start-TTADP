import React, { useMemo } from 'react';
import type { WidgetSortConfig } from '../../../../hooks/useWidgetSorting';
import AddTtaRequestButton from '../../components/AddTtaRequestButton';
import TtaRequestsTable, { type TtaRequestsTableRow } from './TtaRequestsTable';
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
  COLUMNS.GOAL,
  COLUMNS.REVIEWER,
  COLUMNS.APPROVER,
  COLUMNS.ASSIGNED_STAFF,
  COLUMNS.STATUS,
];

const DATE_SORT_COLUMNS = [COLUMNS.CREATED_DATE];

const DEFAULT_SORT_CONFIG: WidgetSortConfig = {
  sortBy: COLUMNS.CREATED_DATE,
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

/*
  Every link stays inside the recipient record the table is being viewed from. The
  placeholder rows describe requests that don't exist, so linking anywhere derived
  from them lands on a recipient/region the user has no access to (a 401).

  TODO: link to the TTA request view/edit pages once they exist.
*/
const toTableRow = (request: ActiveTtaRequest, recipientPath: string): TtaRequestsTableRow => ({
  id: request.id,
  heading: request.requestId,
  sortKey: request.requestId,
  isUrl: true,
  isInternalLink: true,
  link: `${recipientPath}/tta-request`,
  data: [
    { title: COLUMNS.CREATED_DATE, value: request.createdDate },
    { title: COLUMNS.GOAL, value: request.goal },
    { title: COLUMNS.REVIEWER, value: request.reviewer },
    { title: COLUMNS.APPROVER, value: request.approver },
    { title: COLUMNS.ASSIGNED_STAFF, value: request.assignedStaff },
    // only drafts are clickable, they take the creator back into the request
    request.status === DRAFT_STATUS
      ? {
          title: COLUMNS.STATUS,
          value: DRAFT_STATUS,
          isUrl: true,
          isInternalLink: true,
          link: `${recipientPath}/tta-request`,
        }
      : { title: COLUMNS.STATUS, value: request.status },
  ],
});

interface ActiveTtaRequestsTableProps {
  recipientId: string | number;
  regionId: string | number;
}

export default function ActiveTtaRequestsTable({
  recipientId,
  regionId,
}: ActiveTtaRequestsTableProps): React.ReactElement {
  const recipientPath = `/recipient-tta-records/${recipientId}/region/${regionId}`;

  // FOR FRONTEND TESTING ONLY - swap for a fetcher when the API lands.
  const rows = useMemo(
    () => ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.map((request) => toTableRow(request, recipientPath)),
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
      emptyState={EMPTY_STATE}
      // Status stays frozen to the right as the table scrolls horizontally
      stickyLastDataColumn
    />
  );
}
