/* eslint-disable import/prefer-default-export */
import {
  regionFilter,
  startDateFilter,
  endDateFilter,
  grantNumberFilter,
  groupsFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  reportIdFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  reportTextFilter,
  singleOrMultiRecipientsFilter,
  topicsFilter,
  participantsFilter,
  myReportsFilter,
  ttaTypeFilter,
  grantStatusFilter,
} from '../../components/filter/activityReportFilters';

const DASHBOARD_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  grantNumberFilter,
  groupsFilter,
  myReportsFilter,
  participantsFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  regionFilter,
  reportIdFilter,
  reportTextFilter,
  singleOrMultiRecipientsFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
  grantStatusFilter,
];

// sort by display prop
DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { DASHBOARD_FILTER_CONFIG };
