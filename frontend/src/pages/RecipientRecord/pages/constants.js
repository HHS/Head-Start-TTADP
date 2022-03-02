import { specialistRoleFilter, endDateFilter, startDateFilter } from '../../../components/filter/activityReportFilters';
import {
  statusFilter, createDateFilter, topicsFilter, reasonsFilter, grantNumberFilter,
} from '../../../components/filter/goalFilters';

export const GOALS_AND_OBJECTIVES_FILTER_CONFIG = [
  createDateFilter, reasonsFilter, statusFilter, topicsFilter,
];

export const getGoalsAndObjectivesFilterConfig = (grantNumberParams) => [
  ...GOALS_AND_OBJECTIVES_FILTER_CONFIG,
  grantNumberFilter(grantNumberParams),
];

export const TTAHISTORY_FILTER_CONFIG = [
  endDateFilter,
  startDateFilter,
  specialistRoleFilter,
];
