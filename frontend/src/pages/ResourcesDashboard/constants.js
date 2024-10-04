/* eslint-disable import/prefer-default-export */
import {
  regionFilter,
  endDateFilter,
  startDateFilter,
  grantNumberFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  reportIdFilter,
  resourceAttachmentFilter,
  resourceLinkFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  singleOrMultiRecipientsFilter,
  topicsFilter,
  otherEntitiesFilter,
  participantsFilter,
  reportTextFilter,
  ttaTypeFilter,
  activityReportGoalResponseFilter,
  grantStatusFilter,
} from '../../components/filter/activityReportFilters';
import { goalNameFilter } from '../../components/filter/goalFilters';

const RESOURCES_DASHBOARD_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  activityReportGoalResponseFilter,
  grantNumberFilter,
  goalNameFilter,
  otherEntitiesFilter,
  participantsFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  regionFilter,
  reportIdFilter,
  reportTextFilter,
  resourceAttachmentFilter,
  resourceLinkFilter,
  singleOrMultiRecipientsFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
  grantStatusFilter,
];

RESOURCES_DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { RESOURCES_DASHBOARD_FILTER_CONFIG };
