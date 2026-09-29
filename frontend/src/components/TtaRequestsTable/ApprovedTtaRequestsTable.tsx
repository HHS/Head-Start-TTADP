import React, { useMemo } from 'react';
import type { WidgetSortConfig } from '../../hooks/useWidgetSorting';
import TtaRequestsTable, { recipientRecordUrl, type TtaRequestsTableRow } from './index';
import { APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA, type ApprovedTtaRequest } from './placeholderData';

const EXPORT_FILE_NAME = 'approved-tta-requests.csv';

const EMPTY_STATE = (
  <p className="font-serif-md margin-0 padding-10 text-bold text-center">
    You have no approved TTA requests.
  </p>
);

export const COLUMNS = {
  REQUEST_ID: 'Request ID',
  RECIPIENT: 'Recipient',
  REGION: 'Region',
  APPROVED_DATE: 'Approved date',
  CREATOR: 'Creator',
  ASSIGNED_STAFF: 'Assigned staff',
  GOAL: 'Goal',
  STATE: 'State',
};

// "Request ID" is rendered by the table as the first column, so it isn't in `headers`.
const HEADERS = [COLUMNS.APPROVED_DATE, COLUMNS.CREATOR, COLUMNS.ASSIGNED_STAFF, COLUMNS.GOAL];

// across recipients the table has to say which recipient, region and state each request is for
const HEADERS_WITH_RECIPIENT = [COLUMNS.RECIPIENT, COLUMNS.REGION, ...HEADERS, COLUMNS.STATE];

const STRING_SORT_COLUMNS = [COLUMNS.CREATOR, COLUMNS.ASSIGNED_STAFF, COLUMNS.GOAL];

// Region is left off every sort list so it sorts numerically rather than as text
const STRING_SORT_COLUMNS_WITH_RECIPIENT = [
  COLUMNS.RECIPIENT,
  COLUMNS.STATE,
  ...STRING_SORT_COLUMNS,
];

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
const toTableRow = (
  request: ApprovedTtaRequest,
  link: string,
  showRecipientColumns: boolean
): TtaRequestsTableRow => ({
  id: request.id,
  heading: request.requestId,
  sortKey: request.requestId,
  isUrl: true,
  isInternalLink: true,
  link,
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
    { title: COLUMNS.APPROVED_DATE, value: request.approvedDate },
    { title: COLUMNS.CREATOR, value: request.creator },
    {
      title: COLUMNS.ASSIGNED_STAFF,
      value: staffToValue(request.assignedStaff),
      className: 'ttahub-tta-requests-table--multiline',
    },
    { title: COLUMNS.GOAL, value: request.goal },
    // the state the recipient's grant is in
    ...(showRecipientColumns ? [{ title: COLUMNS.STATE, value: request.stateCode }] : []),
  ],
});

interface ApprovedTtaRequestsTableProps {
  /** the recipient record this table is being viewed from, if any */
  recipientId?: string | number;
  regionId?: string | number;
  /** adds the recipient and region columns for the all regions page */
  showRecipientColumns?: boolean;
}

export default function ApprovedTtaRequestsTable({
  recipientId,
  regionId,
  showRecipientColumns = false,
}: ApprovedTtaRequestsTableProps): React.ReactElement {
  const link = showRecipientColumns
    ? '/tta-requests'
    : `/recipient-tta-records/${recipientId}/region/${regionId}/tta-request`;

  // FOR FRONTEND TESTING ONLY - swap for a fetcher when the API lands.
  const rows = useMemo(
    () =>
      APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA.map((request) =>
        toTableRow(request, link, showRecipientColumns)
      ),
    [link, showRecipientColumns]
  );

  return (
    <TtaRequestsTable
      title="Approved TTA requests"
      // see the note on the active table about why these keys differ per page
      sortStorageKey={
        showRecipientColumns ? 'all-approved-tta-requests-table' : 'approved-tta-requests-table'
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
      emptyState={EMPTY_STATE}
    />
  );
}
