import {
  activityReportGoalResponseFilter,
  domainClassroomOrganizationFilter,
  domainEmotionalSupportFilter,
  domainInstructionalSupportFilter,
  endDateFilter,
  grantNumberFilter,
  grantStatusFilter,
  groupsFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  regionFilter,
  reportIdFilter,
  reportTextFilter,
  singleOrMultiRecipientsFilter,
  specialistRoleFilter,
  startDateFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
} from '../../components/filter/activityReportFilters';
import {
  createDateFilter,
  goalNameFilter,
  statusFilter,
} from '../../components/filter/goalFilters';

const QA_DASHBOARD_FILTER_KEY = 'qa-dashboard';

const QA_DASHBOARD_FILTER_CONFIG = [
  createDateFilter,
  endDateFilter,
  startDateFilter,
  activityReportGoalResponseFilter,
  goalNameFilter,
  grantNumberFilter,
  grantStatusFilter,
  groupsFilter,
  singleOrMultiRecipientsFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  regionFilter,
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
  statusFilter,
];

QA_DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { QA_DASHBOARD_FILTER_CONFIG, QA_DASHBOARD_FILTER_KEY };
