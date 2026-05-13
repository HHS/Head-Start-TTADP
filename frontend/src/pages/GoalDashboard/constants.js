import { createDateFilter } from '../../components/filter/goalFilters';

export const GOAL_DASHBOARD_FILTER_KEY = 'goal-dashboard';

// Filter configuration for the Goal Dashboard.
// Add individual filter objects here as new filters are introduced.
export const GOAL_DASHBOARD_FILTER_CONFIG = [
  createDateFilter,
];
