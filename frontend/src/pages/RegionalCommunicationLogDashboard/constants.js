/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  groupsFilter,
  purposeFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  groupsFilter,
  purposeFilter,
];

export { DASHBOARD_FILTER_CONFIG };
