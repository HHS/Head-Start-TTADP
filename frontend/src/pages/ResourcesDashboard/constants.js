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
  feiRootCauseFilter,
} from '../../components/filter/activityReportFilters';

const RESOURCES_DASHBOARD_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  feiRootCauseFilter,
  grantNumberFilter,
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
];

RESOURCES_DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { RESOURCES_DASHBOARD_FILTER_CONFIG };
