import { DECIMAL_BASE } from '@ttahub/common';
import {
  specialistRoleFilter,
  endDateFilter,
  startDateFilter,
  myReportsFilter,
  activityReportGoalResponseFilter,
} from '../../../components/filter/activityReportFilters';
import {
  statusFilter,
  createDateFilter,
  topicsFilter,
  reasonsFilter,
  grantNumberFilter,
  userRolesFilter,
  goalNameFilter,
} from '../../../components/filter/goalFilters';

export const getGoalsAndObjectivesFilterConfig = (grantNumberParams) => [
  createDateFilter,
  goalNameFilter,
  grantNumberFilter(grantNumberParams),
  reasonsFilter,
  statusFilter,
  topicsFilter,
  userRolesFilter,
].sort((a, b) => a.display.localeCompare(b.display));

const TTAHISTORY_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  activityReportGoalResponseFilter,
  myReportsFilter,
  specialistRoleFilter,
];

TTAHISTORY_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));
export { TTAHISTORY_FILTER_CONFIG };

export const GOALS_OBJECTIVES_FILTER_KEY = (recipientId) => `goals-objectives-filters-${recipientId}`;

export const getIdParamArray = (search) => {
  const searchParams = new URLSearchParams(search);
  return searchParams.get('id[]') ? searchParams.getAll('id[]').map((id) => parseInt(id, DECIMAL_BASE)) : [];
};
