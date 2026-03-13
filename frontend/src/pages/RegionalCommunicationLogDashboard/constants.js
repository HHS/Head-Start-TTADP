/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
];

export { DASHBOARD_FILTER_CONFIG };
