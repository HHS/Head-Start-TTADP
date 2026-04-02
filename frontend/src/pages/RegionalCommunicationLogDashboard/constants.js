/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  goalFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  goalFilter,
];

export { DASHBOARD_FILTER_CONFIG };
