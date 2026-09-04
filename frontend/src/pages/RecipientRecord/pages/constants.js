import { DECIMAL_BASE } from '@ttahub/common';
import {
  endDateFilter,
  startDateFilter,
  ttaHistoryMyReportsFilter,
} from '../../../components/filter/activityReportFilters';
import {
  createDateFilter,
  goalCategoryFilter,
  grantNumberFilter,
  reasonsFilter,
  statusFilter,
  topicsFilter,
  userRolesFilter,
} from '../../../components/filter/goalFilters';

export const getGoalsAndObjectivesFilterConfig = (grantNumberParams) =>
  [
    createDateFilter,
    goalCategoryFilter,
    grantNumberFilter(grantNumberParams),
    reasonsFilter,
    statusFilter,
    topicsFilter,
    userRolesFilter,
  ].sort((a, b) => a.display.localeCompare(b.display));

const TTAHISTORY_FILTER_CONFIG = [
  { ...startDateFilter, display: 'Date started' },
  { ...endDateFilter, display: 'Date ended' },
  ttaHistoryMyReportsFilter,
];

TTAHISTORY_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { TTAHISTORY_FILTER_CONFIG };

export const GOALS_OBJECTIVES_FILTER_KEY = (recipientId) =>
  `goals-objectives-filters-${recipientId}`;

export const TTA_TIMELINE_FEATURE_FLAG = 'tta_timeline';

export const getIdParamArray = (search) => {
  const searchParams = new URLSearchParams(search);
  return searchParams.get('id[]')
    ? searchParams.getAll('id[]').map((id) => parseInt(id, DECIMAL_BASE))
    : [];
};
