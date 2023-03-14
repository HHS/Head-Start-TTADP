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
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  participantsFilter,
  myReportsFilter,
  ttaTypeFilter,
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
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
];
