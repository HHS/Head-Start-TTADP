import { specialistRoleFilter, startDateFilter } from '../../../components/filter/activityReportFilters';
import {
  statusFilter, createDateFilter, topicsFilter, reasonsFilter, grantNumberFilter,
} from '../../../components/filter/goalFilters';

const GOALS_AND_OBJECTIVES_FILTER_CONFIG = [
  createDateFilter, statusFilter, topicsFilter, reasonsFilter,
];

export const getGoalsAndObjectivesFilterConfig = (grantNumberParams) => [
  ...GOALS_AND_OBJECTIVES_FILTER_CONFIG,
  grantNumberFilter(grantNumberParams),
];

export const TTAHISTORY_FILTER_CONFIG = [
  startDateFilter,
  specialistRoleFilter,
];
