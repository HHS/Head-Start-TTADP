/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
  purposeFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
  purposeFilter,
];

export { DASHBOARD_FILTER_CONFIG };
