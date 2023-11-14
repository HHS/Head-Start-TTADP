/* eslint-disable import/prefer-default-export */
import {
  regionFilter,
  startDateFilter,
  endDateFilter,
  grantNumberFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  reportIdFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  singleOrMultiRecipientsFilter,
  topicsFilter,
  participantsFilter,
  myReportsFilter,
  ttaTypeFilter,
  reportTextFilter,
  deliveryMethodFilter,
  activityReportGoalResponseFilter,
} from '../../components/filter/activityReportFilters';

import { groupsFilter } from '../../components/filter/grantFilters';

const DASHBOARD_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  activityReportGoalResponseFilter,
  deliveryMethodFilter,
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
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
];

// sort by display prop
DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { DASHBOARD_FILTER_CONFIG };
