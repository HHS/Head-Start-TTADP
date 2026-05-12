/* eslint-disable import/prefer-default-export */
import {
  activityReportGoalResponseFilter,
  deliveryMethodFilter,
  endDateFilter,
  grantNumberFilter,
  grantStatusFilter,
  myReportsFilter,
  participantsFilter,
  priorityIndicatorFilter,
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
import { groupsFilter, lastTTA } from '../../components/filter/grantFilters';

const MONITORING_FILTER_CONFIG = [
  regionFilter,
  {
    ...startDateFilter,
    display: 'Date',
  },
];

// sort by display prop
MONITORING_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

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
  regionFilter, // Region
  stateCodeFilter, // State or territory
];

RECIPIENT_SPOTLIGHT_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { DASHBOARD_FILTER_CONFIG, MONITORING_FILTER_CONFIG, RECIPIENT_SPOTLIGHT_FILTER_CONFIG };
