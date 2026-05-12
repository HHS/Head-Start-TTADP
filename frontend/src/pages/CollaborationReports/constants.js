import {
  activityPurposeFilter,
  goalFilter,
  regionFilter,
  startDateFilter,
  stateCodeFilter,
} from '../../components/filter/collabReportFilters';

const COLLAB_REPORT_FILTER_CONFIG = [
  startDateFilter,
  activityPurposeFilter,
  goalFilter,
  regionFilter,
  stateCodeFilter,
];

// eslint-disable-next-line import/prefer-default-export
export { COLLAB_REPORT_FILTER_CONFIG };
