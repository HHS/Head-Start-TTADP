/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  purposeFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  purposeFilter,
];

export { DASHBOARD_FILTER_CONFIG };
