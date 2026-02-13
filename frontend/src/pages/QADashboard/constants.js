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
  regionFilter,
} from '../../components/filter/activityReportFilters'
import { createDateFilter, goalNameFilter, statusFilter } from '../../components/filter/goalFilters'

const QA_DASHBOARD_FILTER_KEY = 'qa-dashboard'

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
]

QA_DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display))

export { QA_DASHBOARD_FILTER_CONFIG, QA_DASHBOARD_FILTER_KEY }
