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

const LEGEND_SHAPES = ['circle', 'triangle', 'square'];

const identity = (label) => label;

export const deriveLineGraphLegendConfig = (
  data,
  fallbackConfig = [],
  labelFormatter = identity
) => {
  if (!Array.isArray(data) || !data.length) {
    return fallbackConfig;
  }

  const derivedLegendConfig = data.map((trace) => {
    if (
      !trace ||
      !trace.id ||
      !trace.trace ||
      !trace.name ||
      !LEGEND_SHAPES.includes(trace.trace)
    ) {
      return null;
    }

    return {
      label: labelFormatter(trace.name),
      selected: true,
      shape: trace.trace,
      id: `${trace.id}-checkbox`,
      traceId: trace.id,
    };
  });

  if (derivedLegendConfig.some((legend) => !legend)) {
    return fallbackConfig;
  }

  return derivedLegendConfig;
};
