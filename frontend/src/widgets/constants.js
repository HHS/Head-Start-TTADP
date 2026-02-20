export const APPROVAL_RATE_BY_DEADLINE_EXPORT_NAME = 'Approval rate by deadline';
export const APPROVAL_RATE_BY_DEADLINE_FIRST_COLUMN = 'Months';
export const APPROVAL_RATE_BY_DEADLINE_TABLE_CAPTION = 'Approval rate by deadline by month';

export const APPROVAL_RATE_BY_DEADLINE_TRACE_IDS = {
  REGION: 'approval-rate-region',
  NATIONAL: 'approval-rate-national',
};

export const APPROVAL_RATE_BY_DEADLINE_LEGEND_CONFIG = [
  {
    label: 'Region',
    selected: true,
    shape: 'circle',
    id: 'show-approval-rate-region',
    traceId: APPROVAL_RATE_BY_DEADLINE_TRACE_IDS.REGION,
  },
  {
    label: 'National average',
    selected: true,
    shape: 'triangle',
    id: 'show-approval-rate-national',
    traceId: APPROVAL_RATE_BY_DEADLINE_TRACE_IDS.NATIONAL,
  },
];
