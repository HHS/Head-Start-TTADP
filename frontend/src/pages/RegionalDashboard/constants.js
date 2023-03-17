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
  myReportsFilter,
  ttaTypeFilter,
  reportTextFilter,
} from '../../components/filter/activityReportFilters';

import { groupsFilter } from '../../components/filter/grantFilters';

export const DASHBOARD_FILTER_CONFIG = [
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
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
];
