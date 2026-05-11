/**
 * Development-only test data sets for the Goal Status Reason Sankey graph.
 *
 * Each dataset represents a named scenario useful for manual UI testing.
 * Only imported and used when process.env.NODE_ENV === 'development'.
 *
 * Data shape mirrors the API response from fetchGoalDashboardData:
 *   { total, statusRows, reasonRows, sankey: { nodes, links } }
 *
 * Node id prefixes:
 *   'goals'                       — the root totals node
 *   'status:<Status>'             — a goal-status bucket
 *   'reason:<Status>:<Reason>'    — a closure/suspension reason leaf
 */

// ─── Scenario 1: Typical ─────────────────────────────────────────────────────
// Reflects a realistic region: mostly not-started, a handful of closures.
const typical = {
  total: 67,
  statusRows: [
    { status: 'Not Started', label: 'Not started', count: 37, percentage: 55.22 },
    { status: 'In Progress', label: 'In progress', count: 24, percentage: 35.82 },
    { status: 'Closed', label: 'Closed', count: 4, percentage: 5.97 },
    { status: 'Suspended', label: 'Suspended', count: 2, percentage: 2.99 },
  ],
  reasonRows: [
    { status: 'Closed', statusLabel: 'Closed', reason: 'TTA complete', count: 3, percentage: 75 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Recipient request', count: 1, percentage: 25 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Key staff turnover / vacancies', count: 1, percentage: 50 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Recipient is not responding', count: 1, percentage: 50 },
  ],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 67, percentage: 100 },
      { id: 'status:Not Started', label: 'Not started', count: 37, percentage: 55.22 },
      { id: 'status:In Progress', label: 'In progress', count: 24, percentage: 35.82 },
      { id: 'status:Closed', label: 'Closed', count: 4, percentage: 5.97 },
      { id: 'status:Suspended', label: 'Suspended', count: 2, percentage: 2.99 },
      { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 3, percentage: 75 },
      { id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 1, percentage: 25 },
      { id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 1, percentage: 50 },
      { id: 'reason:Suspended:Recipient is not responding', label: 'Recipient is not responding', count: 1, percentage: 50 },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 37 },
      { source: 'goals', target: 'status:In Progress', value: 24 },
      { source: 'goals', target: 'status:Closed', value: 4 },
      { source: 'goals', target: 'status:Suspended', value: 2 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 3 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 1 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 1 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient is not responding', value: 1 },
    ],
  },
};

// ─── Scenario 2: Balanced ─────────────────────────────────────────────────────
// Equal 25% split across all four statuses; tests even flow widths.
// Both Closed and Suspended have multiple reasons to exercise the reason column.
const balanced = {
  total: 100,
  statusRows: [
    { status: 'Not Started', label: 'Not started', count: 25, percentage: 25 },
    { status: 'In Progress', label: 'In progress', count: 25, percentage: 25 },
    { status: 'Closed', label: 'Closed', count: 25, percentage: 25 },
    { status: 'Suspended', label: 'Suspended', count: 25, percentage: 25 },
  ],
  reasonRows: [
    { status: 'Closed', statusLabel: 'Closed', reason: 'TTA complete', count: 10, percentage: 40 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Duplicate goal', count: 8, percentage: 32 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Recipient request', count: 5, percentage: 20 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Other', count: 2, percentage: 8 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Key staff turnover / vacancies', count: 12, percentage: 48 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Recipient is not responding', count: 8, percentage: 32 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Other', count: 5, percentage: 20 },
  ],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 100, percentage: 100 },
      { id: 'status:Not Started', label: 'Not started', count: 25, percentage: 25 },
      { id: 'status:In Progress', label: 'In progress', count: 25, percentage: 25 },
      { id: 'status:Closed', label: 'Closed', count: 25, percentage: 25 },
      { id: 'status:Suspended', label: 'Suspended', count: 25, percentage: 25 },
      { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 10, percentage: 40 },
      { id: 'reason:Closed:Duplicate goal', label: 'Duplicate goal', count: 8, percentage: 32 },
      { id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 5, percentage: 20 },
      { id: 'reason:Closed:Other', label: 'Other', count: 2, percentage: 8 },
      { id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 12, percentage: 48 },
      { id: 'reason:Suspended:Recipient is not responding', label: 'Recipient is not responding', count: 8, percentage: 32 },
      { id: 'reason:Suspended:Other', label: 'Other', count: 5, percentage: 20 },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 25 },
      { source: 'goals', target: 'status:In Progress', value: 25 },
      { source: 'goals', target: 'status:Closed', value: 25 },
      { source: 'goals', target: 'status:Suspended', value: 25 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 10 },
      { source: 'status:Closed', target: 'reason:Closed:Duplicate goal', value: 8 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 5 },
      { source: 'status:Closed', target: 'reason:Closed:Other', value: 2 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 12 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient is not responding', value: 8 },
      { source: 'status:Suspended', target: 'reason:Suspended:Other', value: 5 },
    ],
  },
};

// ─── Scenario 3: Dense Reasons ────────────────────────────────────────────────
// High proportion of closures and suspensions, every possible reason present.
// Good for testing label de-overlap and link-width scaling with many reason nodes.
const denseReasons = {
  total: 50,
  statusRows: [
    { status: 'Not Started', label: 'Not started', count: 5, percentage: 10 },
    { status: 'In Progress', label: 'In progress', count: 5, percentage: 10 },
    { status: 'Closed', label: 'Closed', count: 30, percentage: 60 },
    { status: 'Suspended', label: 'Suspended', count: 10, percentage: 20 },
  ],
  reasonRows: [
    { status: 'Closed', statusLabel: 'Closed', reason: 'TTA complete', count: 12, percentage: 40 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Duplicate goal', count: 8, percentage: 26.67 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Recipient request', count: 5, percentage: 16.67 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Recipient is not responding', count: 3, percentage: 10 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Other', count: 2, percentage: 6.67 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Key staff turnover / vacancies', count: 4, percentage: 40 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Recipient is not responding', count: 3, percentage: 30 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Recipient request', count: 2, percentage: 20 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Other', count: 1, percentage: 10 },
  ],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 50, percentage: 100 },
      { id: 'status:Not Started', label: 'Not started', count: 5, percentage: 10 },
      { id: 'status:In Progress', label: 'In progress', count: 5, percentage: 10 },
      { id: 'status:Closed', label: 'Closed', count: 30, percentage: 60 },
      { id: 'status:Suspended', label: 'Suspended', count: 10, percentage: 20 },
      { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 12, percentage: 40 },
      { id: 'reason:Closed:Duplicate goal', label: 'Duplicate goal', count: 8, percentage: 26.67 },
      { id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 5, percentage: 16.67 },
      { id: 'reason:Closed:Recipient is not responding', label: 'Recipient is not responding', count: 3, percentage: 10 },
      { id: 'reason:Closed:Other', label: 'Other', count: 2, percentage: 6.67 },
      { id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 4, percentage: 40 },
      { id: 'reason:Suspended:Recipient is not responding', label: 'Recipient is not responding', count: 3, percentage: 30 },
      { id: 'reason:Suspended:Recipient request', label: 'Recipient request', count: 2, percentage: 20 },
      { id: 'reason:Suspended:Other', label: 'Other', count: 1, percentage: 10 },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 5 },
      { source: 'goals', target: 'status:In Progress', value: 5 },
      { source: 'goals', target: 'status:Closed', value: 30 },
      { source: 'goals', target: 'status:Suspended', value: 10 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 12 },
      { source: 'status:Closed', target: 'reason:Closed:Duplicate goal', value: 8 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 5 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient is not responding', value: 3 },
      { source: 'status:Closed', target: 'reason:Closed:Other', value: 2 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 4 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient is not responding', value: 3 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient request', value: 2 },
      { source: 'status:Suspended', target: 'reason:Suspended:Other', value: 1 },
    ],
  },
};

// ─── Scenario 4: Mostly Active ────────────────────────────────────────────────
// Very few closures — tests small link widths alongside dominant flows.
const mostlyActive = {
  total: 200,
  statusRows: [
    { status: 'Not Started', label: 'Not started', count: 80, percentage: 40 },
    { status: 'In Progress', label: 'In progress', count: 115, percentage: 57.5 },
    { status: 'Closed', label: 'Closed', count: 3, percentage: 1.5 },
    { status: 'Suspended', label: 'Suspended', count: 2, percentage: 1 },
  ],
  reasonRows: [
    { status: 'Closed', statusLabel: 'Closed', reason: 'TTA complete', count: 2, percentage: 66.67 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Other', count: 1, percentage: 33.33 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Recipient request', count: 2, percentage: 100 },
  ],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 200, percentage: 100 },
      { id: 'status:Not Started', label: 'Not started', count: 80, percentage: 40 },
      { id: 'status:In Progress', label: 'In progress', count: 115, percentage: 57.5 },
      { id: 'status:Closed', label: 'Closed', count: 3, percentage: 1.5 },
      { id: 'status:Suspended', label: 'Suspended', count: 2, percentage: 1 },
      { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 2, percentage: 66.67 },
      { id: 'reason:Closed:Other', label: 'Other', count: 1, percentage: 33.33 },
      { id: 'reason:Suspended:Recipient request', label: 'Recipient request', count: 2, percentage: 100 },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 80 },
      { source: 'goals', target: 'status:In Progress', value: 115 },
      { source: 'goals', target: 'status:Closed', value: 3 },
      { source: 'goals', target: 'status:Suspended', value: 2 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 2 },
      { source: 'status:Closed', target: 'reason:Closed:Other', value: 1 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient request', value: 2 },
    ],
  },
};

// ─── Scenario 5: Minimal ──────────────────────────────────────────────────────
// Only 3 goals — one per active status, one closed with a single reason.
// Tests rendering at very small scale.
const minimal = {
  total: 3,
  statusRows: [
    { status: 'Not Started', label: 'Not started', count: 1, percentage: 33.33 },
    { status: 'In Progress', label: 'In progress', count: 1, percentage: 33.33 },
    { status: 'Closed', label: 'Closed', count: 1, percentage: 33.33 },
    { status: 'Suspended', label: 'Suspended', count: 0, percentage: 0 },
  ],
  reasonRows: [
    { status: 'Closed', statusLabel: 'Closed', reason: 'TTA complete', count: 1, percentage: 100 },
  ],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 3, percentage: 100 },
      { id: 'status:Not Started', label: 'Not started', count: 1, percentage: 33.33 },
      { id: 'status:In Progress', label: 'In progress', count: 1, percentage: 33.33 },
      { id: 'status:Closed', label: 'Closed', count: 1, percentage: 33.33 },
      { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 1, percentage: 100 },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 1 },
      { source: 'goals', target: 'status:In Progress', value: 1 },
      { source: 'goals', target: 'status:Closed', value: 1 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 1 },
    ],
  },
};

// ─── Scenario 6: No Active Goals ─────────────────────────────────────────────
// All goals are closed or suspended — no not-started or in-progress flow.
// Tests chart with no left-column "active" bands.
const allClosed = {
  total: 20,
  statusRows: [
    { status: 'Not Started', label: 'Not started', count: 0, percentage: 0 },
    { status: 'In Progress', label: 'In progress', count: 0, percentage: 0 },
    { status: 'Closed', label: 'Closed', count: 15, percentage: 75 },
    { status: 'Suspended', label: 'Suspended', count: 5, percentage: 25 },
  ],
  reasonRows: [
    { status: 'Closed', statusLabel: 'Closed', reason: 'TTA complete', count: 8, percentage: 53.33 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Duplicate goal', count: 4, percentage: 26.67 },
    { status: 'Closed', statusLabel: 'Closed', reason: 'Recipient request', count: 3, percentage: 20 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Key staff turnover / vacancies', count: 3, percentage: 60 },
    { status: 'Suspended', statusLabel: 'Suspended', reason: 'Recipient is not responding', count: 2, percentage: 40 },
  ],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 20, percentage: 100 },
      { id: 'status:Closed', label: 'Closed', count: 15, percentage: 75 },
      { id: 'status:Suspended', label: 'Suspended', count: 5, percentage: 25 },
      { id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 8, percentage: 53.33 },
      { id: 'reason:Closed:Duplicate goal', label: 'Duplicate goal', count: 4, percentage: 26.67 },
      { id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 3, percentage: 20 },
      { id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 3, percentage: 60 },
      { id: 'reason:Suspended:Recipient is not responding', label: 'Recipient is not responding', count: 2, percentage: 40 },
    ],
    links: [
      { source: 'goals', target: 'status:Closed', value: 15 },
      { source: 'goals', target: 'status:Suspended', value: 5 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 8 },
      { source: 'status:Closed', target: 'reason:Closed:Duplicate goal', value: 4 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 3 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 3 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient is not responding', value: 2 },
    ],
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────
// Ordered list of { key, label, data } for use in the UI dropdown.
export const SANKEY_TEST_DATASETS = [
  { key: 'typical', label: 'Typical (67 goals, mixed)', data: typical },
  { key: 'balanced', label: 'Balanced (100 goals, equal split)', data: balanced },
  { key: 'denseReasons', label: 'Dense Reasons (50 goals, many closures)', data: denseReasons },
  { key: 'mostlyActive', label: 'Mostly Active (200 goals, few closures)', data: mostlyActive },
  { key: 'minimal', label: 'Minimal (3 goals)', data: minimal },
  { key: 'allClosed', label: 'No Active Goals (20 goals, all closed/suspended)', data: allClosed },
];
