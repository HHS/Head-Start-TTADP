/* eslint-disable import/prefer-default-export */
import {
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
  regionFilter,
  grantStatusFilter,
  priorityIndicatorFilter,
} from '../../components/filter/activityReportFilters';
import { goalNameFilter } from '../../components/filter/goalFilters';
import { groupsFilter, lastTTA } from '../../components/filter/grantFilters';

const DASHBOARD_FILTER_CONFIG = [
  startDateFilter,
  endDateFilter,
  activityReportGoalResponseFilter,
  deliveryMethodFilter,
  grantNumberFilter,
  groupsFilter,
  goalNameFilter,
  myReportsFilter,
  participantsFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  reportIdFilter,
  regionFilter,
  reportTextFilter,
  singleOrMultiRecipientsFilter,
  specialistRoleFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  ttaTypeFilter,
  grantStatusFilter,
];

// sort by display prop
DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

const RECIPIENT_SPOTLIGHT_FILTER_CONFIG = [
  grantNumberFilter, // Grant number
  groupsFilter, // Group
  lastTTA, // Last TTA
  programSpecialistFilter, // Program specialist
  priorityIndicatorFilter, // Priority indicator (NEW)
  programTypeFilter, // Program types
  regionFilter, // Region
  stateCodeFilter, // State or territory
];

RECIPIENT_SPOTLIGHT_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { DASHBOARD_FILTER_CONFIG, RECIPIENT_SPOTLIGHT_FILTER_CONFIG };
