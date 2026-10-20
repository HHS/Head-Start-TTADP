import React from 'react';
import type { WidgetSortConfig } from '../../hooks/useWidgetSorting';
import TtaRequestsTable, { type TtaRequestsTableRow } from './index';

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

/*
  Requests can't be approved yet - there is no approved status to list - so the table
  shows its empty state until approving a request is built, which brings the fetch and
  the approved date and assigned staff it shows.
*/
const NO_ROWS: TtaRequestsTableRow[] = [];

interface ApprovedTtaRequestsTableProps {
  /** adds the recipient and region columns for the all regions page */
  showRecipientColumns?: boolean;
}

export default function ApprovedTtaRequestsTable({
  showRecipientColumns = false,
}: ApprovedTtaRequestsTableProps): React.ReactElement {
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
      rows={NO_ROWS}
      emptyState={EMPTY_STATE}
    />
  );
}
