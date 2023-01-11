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
  topicsFilter,
  participantsFilter,
} from '../../components/filter/activityReportFilters';

export const RESOURCES_DASHBOARD_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  grantNumberFilter,
  participantsFilter,
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
