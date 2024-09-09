import {
  endDateFilter,
  startDateFilter,
  activityReportGoalResponseFilter,
  grantNumberFilter,
  groupsFilter,
  singleOrMultiRecipientsFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  reportIdFilter,
  reportTextFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
  domainClassroomOrganizationFilter,
  domainEmotionalSupportFilter,
  domainInstructionalSupportFilter,
} from '../../components/filter/activityReportFilters';
import {
  createDateFilter,
  goalNameFilter,
} from '../../components/filter/goalFilters';

const QA_DASHBOARD_FILTER_KEY = 'qa-dashboard';

const QA_DASHBOARD_FILTER_CONFIG = [
  createDateFilter,
  endDateFilter,
  startDateFilter,
  activityReportGoalResponseFilter,
  goalNameFilter,
  grantNumberFilter,
  groupsFilter,
  singleOrMultiRecipientsFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  // region filter is inserted dynamically based on user's regions
  reportIdFilter,
  reportTextFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
  domainClassroomOrganizationFilter,
  domainEmotionalSupportFilter,
  domainInstructionalSupportFilter,
];

QA_DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export {
  QA_DASHBOARD_FILTER_CONFIG,
  QA_DASHBOARD_FILTER_KEY,
};
