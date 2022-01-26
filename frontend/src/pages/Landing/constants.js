import {
  regionFilter,
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
  topicsFilter,
} from '../../components/filter/activityReportFilters';

export const LANDING_BASE_FILTER_CONFIG = [
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
  topicsFilter,
];

export const LANDING_FILTER_CONFIG_WITH_REGIONS = [
  startDateFilter,
  grantNumberFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  regionFilter,
  reportIdFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
];
