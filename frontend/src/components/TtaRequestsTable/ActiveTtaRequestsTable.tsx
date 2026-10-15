import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import { getTtaRequests, getTtaRequestsByRecipient } from '../../fetchers/ttaRequests';
import useFetch from '../../hooks/useFetch';
import type { WidgetSortConfig } from '../../hooks/useWidgetSorting';
import { ttaRequestViewPath } from '../../pages/TtaRequestForm/constants';
import AddTtaRequestButton from '../AddTtaRequestButton';
import TtaRequestsTable, { recipientRecordUrl, type TtaRequestsTableRow } from './index';

/** a request as the TTA request list endpoints return it */
export interface ActiveTtaRequest {
  id: number;
  displayId: string;
  regionId: number;
  recipientId: number | null;
  status: string;
  createdAt: string;
  creator: { id: number; name: string };
  reviewer: { id: number; name: string } | null;
  recipient: { id: number; name: string } | null;
  goalTemplate: { id: number; templateName: string } | null;
  grants: { id: number; stateCode: string | null }[];
}

interface ActiveTtaRequestsResponse {
  count: number;
  rows: ActiveTtaRequest[];
}

const NO_REQUESTS: ActiveTtaRequestsResponse = { count: 0, rows: [] };

/** how each status reads in the table */
const STATUS_LABELS: Record<string, string> = {
  [TTA_REQUEST_STATUSES.DRAFT]: 'Draft',
  [TTA_REQUEST_STATUSES.SUBMITTED]: 'Submitted',
};

// a value a request doesn't have (yet) is left blank, which the table shows as a dash
const BLANK = '';

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

// a draft may not have a recipient yet, so it has nothing to link to
const recipientCell = (request: ActiveTtaRequest) =>
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
const stateCodes = (request: ActiveTtaRequest) =>
  [...new Set(request.grants.map((grant) => grant.stateCode).filter(Boolean))].join(', ');

/*
  The request id and the draft status open the draft in its form; a submitted request's id
  opens it read only. The recipient name opens that recipient's record. Approver and assigned
  staff only exist once a request has been approved, so until then they are blank.
*/
const toTableRow = (
  request: ActiveTtaRequest,
  requestUrl: (requestId: number) => string,
  showRecipientColumns: boolean
): TtaRequestsTableRow => {
  const status = STATUS_LABELS[request.status] ?? request.status;
  const isDraft = request.status === TTA_REQUEST_STATUSES.DRAFT;

  return {
    id: request.id,
    heading: request.displayId,
    sortKey: request.displayId,
    isUrl: true,
    isInternalLink: true,
    link: isDraft ? requestUrl(request.id) : ttaRequestViewPath(request.id),
    data: [
      ...(showRecipientColumns
        ? [recipientCell(request), { title: COLUMNS.REGION, value: String(request.regionId) }]
        : []),
      {
        title: COLUMNS.CREATED_DATE,
        value: moment(request.createdAt).format(DATE_DISPLAY_FORMAT),
      },
      ...(showRecipientColumns ? [{ title: COLUMNS.CREATOR, value: request.creator.name }] : []),
      { title: COLUMNS.GOAL, value: request.goalTemplate?.templateName ?? BLANK },
      ...(showRecipientColumns ? [{ title: COLUMNS.STATE, value: stateCodes(request) }] : []),
      { title: COLUMNS.REVIEWER, value: request.reviewer?.name ?? BLANK },
      { title: COLUMNS.APPROVER, value: BLANK },
      { title: COLUMNS.ASSIGNED_STAFF, value: BLANK },
      // only drafts are clickable, they take the creator back into the request
      isDraft
        ? {
            title: COLUMNS.STATUS,
            value: status,
            isUrl: true,
            isInternalLink: true,
            link: requestUrl(request.id),
          }
        : { title: COLUMNS.STATUS, value: status },
    ],
  };
};

interface ActiveTtaRequestsTableProps {
  /** the recipient record this table is being viewed from, if any */
  recipientId?: string | number;
  regionId?: string | number;
  /** adds the recipient, region and creator columns for the all regions page */
  showRecipientColumns?: boolean;
  /** the all regions page's filters, which pick the regions to list */
  filters?: { topic: string; condition: string; query: string | string[] }[];
}

const NO_FILTERS = [];

export default function ActiveTtaRequestsTable({
  recipientId,
  regionId,
  showRecipientColumns = false,
  filters = NO_FILTERS,
}: ActiveTtaRequestsTableProps): React.ReactElement {
  // where a request lives depends on whether this table spans regions or one recipient
  const requestRoot = showRecipientColumns
    ? '/tta-requests'
    : `/recipient-tta-records/${recipientId}/region/${regionId}/tta-request`;
  const requestUrl = useCallback(
    (requestId: number) => `${requestRoot}/${requestId}`,
    [requestRoot]
  );

  // across recipients the page's filters pick the regions; a recipient's tab is its own
  const fetcher = useCallback(
    (): Promise<ActiveTtaRequestsResponse> =>
      showRecipientColumns
        ? getTtaRequests(filters)
        : getTtaRequestsByRecipient(regionId, recipientId),
    [filters, recipientId, regionId, showRecipientColumns]
  );

  const { data, loading, error } = useFetch(
    NO_REQUESTS,
    fetcher,
    [filters, recipientId, regionId, showRecipientColumns],
    'Unable to load TTA requests.'
  );

  const rows = useMemo(
    () =>
      (data || NO_REQUESTS).rows.map((request) =>
        toTableRow(request, requestUrl, showRecipientColumns)
      ),
    [data, requestUrl, showRecipientColumns]
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
      loading={loading}
      error={error}
      emptyState={emptyState(`${requestRoot}/new`)}
      // Status stays frozen to the right as the table scrolls horizontally
      stickyLastDataColumn
    />
  );
}
