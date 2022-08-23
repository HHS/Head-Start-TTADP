import { specialistRoleFilter, endDateFilter, startDateFilter } from '../../../components/filter/activityReportFilters';
import {
  statusFilter, createDateFilter, topicsFilter, reasonsFilter, grantNumberFilter,
} from '../../../components/filter/goalFilters';

export const getGoalsAndObjectivesFilterConfig = (grantNumberParams) => [
  createDateFilter, grantNumberFilter(grantNumberParams), reasonsFilter, statusFilter, topicsFilter,
];

export const TTAHISTORY_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  specialistRoleFilter,
];

export const GOALS_OBJECTIVES_FILTER_KEY = 'goals-objectives-filters';
