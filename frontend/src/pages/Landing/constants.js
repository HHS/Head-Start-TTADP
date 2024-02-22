import {
  regionFilter,
  endDateFilter,
  startDateFilter,
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
  otherEntitiesFilter,
  participantsFilter,
  myReportsFilter,
  reportTextFilter,
  ttaTypeFilter,
  activityReportGoalResponseFilter,
} from '../../components/filter/activityReportFilters';

import { groupsFilter } from '../../components/filter/grantFilters';

const LANDING_BASE_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  activityReportGoalResponseFilter,
  grantNumberFilter,
  groupsFilter,
  myReportsFilter,
  otherEntitiesFilter,
  participantsFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  reportIdFilter,
  reportTextFilter,
  specialistRoleFilter,
  singleOrMultiRecipientsFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
];

const LANDING_FILTER_CONFIG_WITH_REGIONS = [
  startDateFilter,
  endDateFilter,
  activityReportGoalResponseFilter,
  grantNumberFilter,
  groupsFilter,
  myReportsFilter,
  otherEntitiesFilter,
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

// sort both by display prop
LANDING_BASE_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));
LANDING_FILTER_CONFIG_WITH_REGIONS.sort((a, b) => a.display.localeCompare(b.display));

export { LANDING_BASE_FILTER_CONFIG, LANDING_FILTER_CONFIG_WITH_REGIONS };
