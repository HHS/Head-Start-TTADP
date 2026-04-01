/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
  groupsFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
  groupsFilter,
];

export { DASHBOARD_FILTER_CONFIG };
