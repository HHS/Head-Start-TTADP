import {
  activityMethodFilter,
  activityPurposeFilter,
  activityTypeFilter,
  goalFilter,
  participantFilter,
  regionFilter,
  startDateFilter,
  stateCodeFilter,
} from '../../components/filter/collabReportFilters';

const COLLAB_REPORT_FILTER_CONFIG = [
  activityMethodFilter,
  activityTypeFilter,
  activityPurposeFilter,
  participantFilter,
  goalFilter,
  regionFilter,
  stateCodeFilter,
  startDateFilter,
];

export { COLLAB_REPORT_FILTER_CONFIG };
