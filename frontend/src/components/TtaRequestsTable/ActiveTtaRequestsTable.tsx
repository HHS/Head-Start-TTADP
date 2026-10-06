import React, { useCallback, useMemo } from 'react';
import type { WidgetSortConfig } from '../../hooks/useWidgetSorting';
import AddTtaRequestButton from '../AddTtaRequestButton';
import TtaRequestsTable, { recipientRecordUrl, type TtaRequestsTableRow } from './index';
import {
  ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA,
  type ActiveTtaRequest,
  DRAFT_STATUS,
} from './placeholderData';

const EXPORT_FILE_NAME = 'active-tta-requests.csv';

// the widget title is an h2, so the empty state picks up at h3
const emptyState = (newRequestUrl: string) => (
  <div className="text-center padding-10">
    <h3 className="font-serif-md text-bold margin-top-0 margin-bottom-1">
      You&apos;re all caught up!
    </h3>
    <p className="usa-prose text-center margin-top-0 margin-bottom-2">
      Would you like to begin a new TTA request?
    </p>
    <AddTtaRequestButton label="New TTA request" to={newRequestUrl} />
  </div>
);

export const COLUMNS = {
  REQUEST_ID: 'Request ID',
  RECIPIENT: 'Recipient',
  REGION: 'Region',
  CREATED_DATE: 'Created date',
  CREATOR: 'Creator',
  GOAL: 'Goal',
  STATE: 'State',
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

/*
  Across recipients the table has to say which recipient, region and state each request
  belongs to, and who raised it - none of which the recipient record tab needs, since it
  is already scoped to one recipient.
*/
const HEADERS_WITH_RECIPIENT = [
  COLUMNS.RECIPIENT,
  COLUMNS.REGION,
  COLUMNS.CREATED_DATE,
  COLUMNS.CREATOR,
  COLUMNS.GOAL,
  COLUMNS.STATE,
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

// Region is left off every sort list so it sorts numerically rather than as text
const STRING_SORT_COLUMNS_WITH_RECIPIENT = [
  COLUMNS.RECIPIENT,
  COLUMNS.CREATOR,
  COLUMNS.STATE,
  ...STRING_SORT_COLUMNS,
];

const DATE_SORT_COLUMNS = [COLUMNS.CREATED_DATE];

const DEFAULT_SORT_CONFIG: WidgetSortConfig = {
  sortBy: COLUMNS.CREATED_DATE,
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

/*
  The recipient name opens that recipient's record. Note the placeholder rows name
  recipients that don't exist, so until the API lands those links go nowhere the user can
  read (a 401) - real rows will carry real ids.

  The request id and the draft status open the request itself. There is no fetcher yet, so
  for now that form opens empty whatever id it is given.
*/
const toTableRow = (
  request: ActiveTtaRequest,
  requestUrl: (requestId: number) => string,
  showRecipientColumns: boolean
): TtaRequestsTableRow => ({
  id: request.id,
  heading: request.requestId,
  sortKey: request.requestId,
  isUrl: true,
  isInternalLink: true,
  link: requestUrl(request.id),
  data: [
    ...(showRecipientColumns
      ? [
          {
            title: COLUMNS.RECIPIENT,
            value: request.recipient,
            isUrl: true,
            isInternalLink: true,
            link: recipientRecordUrl(request.recipientId, request.regionId),
          },
          { title: COLUMNS.REGION, value: String(request.regionId) },
        ]
      : []),
    { title: COLUMNS.CREATED_DATE, value: request.createdDate },
    ...(showRecipientColumns ? [{ title: COLUMNS.CREATOR, value: request.creator }] : []),
    { title: COLUMNS.GOAL, value: request.goal },
    // the state the recipient's grant is in
    ...(showRecipientColumns ? [{ title: COLUMNS.STATE, value: request.stateCode }] : []),
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
          link: requestUrl(request.id),
        }
      : { title: COLUMNS.STATUS, value: request.status },
  ],
});

interface ActiveTtaRequestsTableProps {
  /** the recipient record this table is being viewed from, if any */
  recipientId?: string | number;
  regionId?: string | number;
  /** adds the recipient, region and creator columns for the all regions page */
  showRecipientColumns?: boolean;
}

export default function ActiveTtaRequestsTable({
  recipientId,
  regionId,
  showRecipientColumns = false,
}: ActiveTtaRequestsTableProps): React.ReactElement {
  // where a request lives depends on whether this table spans regions or one recipient
  const requestRoot = showRecipientColumns
    ? '/tta-requests'
    : `/recipient-tta-records/${recipientId}/region/${regionId}/tta-request`;
  const requestUrl = useCallback(
    (requestId: number) => `${requestRoot}/${requestId}`,
    [requestRoot]
  );

  // FOR FRONTEND TESTING ONLY - swap for a fetcher when the API lands.
  const rows = useMemo(
    () =>
      ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.map((request) =>
        toTableRow(request, requestUrl, showRecipientColumns)
      ),
    [requestUrl, showRecipientColumns]
  );

  return (
    <TtaRequestsTable
      title="Active TTA requests"
      /*
        the two pages don't share a FilterContext, so their sort keys would collide
        if they used the same name
      */
      sortStorageKey={
        showRecipientColumns ? 'all-active-tta-requests-table' : 'active-tta-requests-table'
      }
      exportFileName={EXPORT_FILE_NAME}
      firstHeading={COLUMNS.REQUEST_ID}
      headers={showRecipientColumns ? HEADERS_WITH_RECIPIENT : HEADERS}
      stringSortColumns={
        showRecipientColumns ? STRING_SORT_COLUMNS_WITH_RECIPIENT : STRING_SORT_COLUMNS
      }
      dateSortColumns={DATE_SORT_COLUMNS}
      defaultSortConfig={DEFAULT_SORT_CONFIG}
      rows={rows}
      emptyState={emptyState(`${requestRoot}/new`)}
      // Status stays frozen to the right as the table scrolls horizontally
      stickyLastDataColumn
    />
  );
}
