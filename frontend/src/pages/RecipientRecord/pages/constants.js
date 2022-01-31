import { specialistRoleFilter, startDateFilter } from '../../../components/filter/activityReportFilters';
import {
  statusFilter, createDateFilter, topicsFilter, reasonsFilter,
} from '../../../components/filter/goalFilters';

export const GOALS_AND_OBJECTIVES_FILTER_CONFIG = [
  createDateFilter, statusFilter, topicsFilter, reasonsFilter,
];

export const TTAHISTORY_FILTER_CONFIG = [
  startDateFilter,
  specialistRoleFilter,
];
