import { Utils } from 'sequelize';

export type SessionReportShape = {
  id: number;
  eventId: number;
  data: unknown;
  files: unknown[];
  supportingAttachments: unknown[];
  updatedAt: string;
  event: unknown;
  approverId: number | null;
  approver: { id: number } | null;
  submitted: boolean;
};

export type SessionReportTableRow = {
  id: number;
  eventId: string | null;
  eventName: string | null;
  sessionName: string | null;
  startDate: string | null;
  endDate: string | null;
  objectiveTopics: string[] | null;
};

export type GetSessionReportsResponse = {
  count: number;
  rows: SessionReportTableRow[];
};

export type GetSessionReportsParams = {
  sortBy?: string;
  sortDir?: string;
  offset?: number;
  limit?: number;
  format?: 'json' | 'csv';
};

type SessionReportSortSortMapEntryKey = 'id' | 'sessionName' | 'startDate' | 'endDate' | 'eventId' | 'eventName';

export type SessionReportTableRowSortMapEntry = readonly [
  string,
  Utils.Literal | string,
] | [ string ];

// eslint-disable-next-line max-len
export type SessionReportSortSortMap = Record<SessionReportSortSortMapEntryKey, SessionReportTableRowSortMapEntry>;
