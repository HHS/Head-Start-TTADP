import {
  activityPurposeFilter,
  goalFilter,
  regionFilter,
  startDateFilter,
} from '../../components/filter/collabReportFilters';

const COLLAB_REPORT_FILTER_CONFIG = [
  startDateFilter,
  activityPurposeFilter,
  goalFilter,
  regionFilter,
];

// eslint-disable-next-line import/prefer-default-export
export { COLLAB_REPORT_FILTER_CONFIG };
