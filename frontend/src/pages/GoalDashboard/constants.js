import {
  createDateFilter,
  goalCategoryFilter,
  goalClosedReasonFilter,
  goalCreatorFilter,
  goalDashboardStatusFilter,
  regionFilter,
} from '../../components/filter/goalFilters';

export const GOAL_DASHBOARD_FILTER_KEY = 'goal-dashboard-filters';

// Filter configuration for the Goal Dashboard.
// Add individual filter objects here as new filters are introduced.
export const GOAL_DASHBOARD_FILTER_CONFIG = [
  createDateFilter,
  goalCategoryFilter,
  goalClosedReasonFilter,
  goalCreatorFilter,
  goalDashboardStatusFilter,
  regionFilter,
];
