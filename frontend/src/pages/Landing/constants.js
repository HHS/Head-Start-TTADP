/* eslint-disable import/prefer-default-export */
import {
  activityReportGoalResponseFilter,
  endDateFilter,
  grantNumberFilter,
  grantStatusFilter,
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
  startDateFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
} from '../../components/filter/activityReportFilters';
import { goalNameFilter } from '../../components/filter/goalFilters';

import { groupsFilter } from '../../components/filter/grantFilters';

export const LANDING_FILTER_CONFIG = (withRegions = false) => {
  const LANDING_BASE_FILTER_CONFIG = [
    startDateFilter,
    endDateFilter,
    activityReportGoalResponseFilter,
    grantNumberFilter,
    groupsFilter,
    goalNameFilter,
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
    grantStatusFilter,
  ];

  if (withRegions) {
    LANDING_BASE_FILTER_CONFIG.push(regionFilter);
  }

  return LANDING_BASE_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));
};
