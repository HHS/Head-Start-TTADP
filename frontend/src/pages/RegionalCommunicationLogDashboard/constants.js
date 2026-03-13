/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  specialistFilter,
  myReportsFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  specialistFilter,
  myReportsFilter,
];

export { DASHBOARD_FILTER_CONFIG };
