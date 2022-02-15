/* eslint-disable import/prefer-default-export */
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
  topicsFilter,
} from '../../components/filter/activityReportFilters';

export const DASHBOARD_FILTER_CONFIG = [
  endDateFilter,
  grantNumberFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  regionFilter,
  reportIdFilter,
  specialistRoleFilter,
  startDateFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
];
