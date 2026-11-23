import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import {
  getApprovedTtaRequests,
  getApprovedTtaRequestsByRecipient,
} from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import type { WidgetSortConfig } from '../../hooks/useWidgetSorting';
import { ttaRequestViewPath } from '../../pages/TtaRequestForm/constants';
import type { ActiveTtaRequest } from './ActiveTtaRequestsTable';
import TtaRequestsTable, { recipientRecordUrl, type TtaRequestsTableRow } from './index';

/** an approved request as the approved list endpoints return it */
export interface ApprovedTtaRequest extends ActiveTtaRequest {
  approvedAt: string | null;
  assignedStaff: { id: number; name: string }[];
}

interface ApprovedTtaRequestsResponse {
  count: number;
  rows: ApprovedTtaRequest[];
}

const NO_REQUESTS: ApprovedTtaRequestsResponse = { count: 0, rows: [] };

// a value a request doesn't have is left blank, which the table shows as a dash
const BLANK = '';

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

// an approved request always has a recipient, but the shape allows for none
const recipientCell = (request: ApprovedTtaRequest) =>
  request.recipient
    ? {
        title: COLUMNS.RECIPIENT,
        value: request.recipient.name,
        isUrl: true,
        isInternalLink: true,
        link: recipientRecordUrl(request.recipient.id, request.regionId),
      }
    : { title: COLUMNS.RECIPIENT, value: BLANK };

// the states the request's grants are in
const stateCodes = (request: ApprovedTtaRequest) =>
  [...new Set(request.grants.map((grant) => grant.stateCode).filter(Boolean))].join(', ');

/** an approved request can't be changed, so its id always opens it read only */
const toTableRow = (
  request: ApprovedTtaRequest,
  viewUrl: (requestId: number) => string,
  showRecipientColumns: boolean
): TtaRequestsTableRow => ({
  id: request.id,
  heading: request.displayId,
  sortKey: request.displayId,
  isUrl: true,
  isInternalLink: true,
  link: viewUrl(request.id),
  data: [
    ...(showRecipientColumns
      ? [recipientCell(request), { title: COLUMNS.REGION, value: String(request.regionId) }]
      : []),
    {
      title: COLUMNS.APPROVED_DATE,
      value: request.approvedAt ? moment(request.approvedAt).format(DATE_DISPLAY_FORMAT) : BLANK,
    },
    { title: COLUMNS.CREATOR, value: request.creator.name },
    {
      title: COLUMNS.ASSIGNED_STAFF,
      value: (request.assignedStaff ?? []).map(({ name }) => name).join(', '),
    },
    // the goal's category, since a goal template's full name is too long for the table
    { title: COLUMNS.GOAL, value: request.goalTemplate?.standard ?? BLANK },
    ...(showRecipientColumns ? [{ title: COLUMNS.STATE, value: stateCodes(request) }] : []),
  ],
});

interface ApprovedTtaRequestsTableProps {
  /** the recipient record this table is being viewed from, if any */
  recipientId?: string | number;
  regionId?: string | number;
  /** adds the recipient and region columns for the all regions page */
  showRecipientColumns?: boolean;
  /** the all regions page's filters, which pick the regions to list */
  filters?: { topic: string; condition: string; query: string | string[] }[];
}

const NO_FILTERS = [];

export default function ApprovedTtaRequestsTable({
  recipientId,
  regionId,
  showRecipientColumns = false,
  filters = NO_FILTERS,
}: ApprovedTtaRequestsTableProps): React.ReactElement {
  // where a request lives depends on whether this table spans regions or one recipient
  const requestRoot = showRecipientColumns
    ? '/tta-requests'
    : `/recipient-tta-records/${recipientId}/region/${regionId}/tta-request`;
  const viewUrl = useCallback(
    (requestId: number) => ttaRequestViewPath(requestId, requestRoot),
    [requestRoot]
  );

  // across recipients the page's filters pick the regions; a recipient's tab is its own
  const fetcher = useCallback(
    (): Promise<ApprovedTtaRequestsResponse> =>
      showRecipientColumns
        ? getApprovedTtaRequests(filters)
        : getApprovedTtaRequestsByRecipient(regionId, recipientId),
    [filters, recipientId, regionId, showRecipientColumns]
  );

  const { data, loading, error } = useFetch(
    NO_REQUESTS,
    fetcher,
    [filters, recipientId, regionId, showRecipientColumns],
    'Unable to load approved TTA requests.'
  );

  const rows = useMemo(
    () =>
      (data || NO_REQUESTS).rows.map((request) =>
        toTableRow(request, viewUrl, showRecipientColumns)
      ),
    [data, viewUrl, showRecipientColumns]
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
      loading={loading}
      error={error}
      emptyState={EMPTY_STATE}
    />
  );
}
