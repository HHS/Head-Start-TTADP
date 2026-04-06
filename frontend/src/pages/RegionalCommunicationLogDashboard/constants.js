/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  myReportsFilter,
  resultFilter,
  specialistFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
];

export { DASHBOARD_FILTER_CONFIG };
