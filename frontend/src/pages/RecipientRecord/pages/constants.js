import {
  specialistRoleFilter, endDateFilter, startDateFilter, myReportsFilter, feiRootCauseFilter,
} from '../../../components/filter/activityReportFilters';
import {
  statusFilter, createDateFilter, topicsFilter, reasonsFilter, grantNumberFilter,
} from '../../../components/filter/goalFilters';

export const getGoalsAndObjectivesFilterConfig = (grantNumberParams) => [
  createDateFilter,
  grantNumberFilter(grantNumberParams),
  reasonsFilter,
  statusFilter,
  topicsFilter,
];

const TTAHISTORY_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  feiRootCauseFilter,
  myReportsFilter,
  specialistRoleFilter,
];

TTAHISTORY_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));
export { TTAHISTORY_FILTER_CONFIG };

export const GOALS_OBJECTIVES_FILTER_KEY = (recipientId) => `goals-objectives-filters-${recipientId}`;
