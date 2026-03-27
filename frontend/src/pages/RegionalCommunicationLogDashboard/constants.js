/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
  goalFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  resultFilter,
  myReportsFilter,
  goalFilter,
];

export { DASHBOARD_FILTER_CONFIG };
