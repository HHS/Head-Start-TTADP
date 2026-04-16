/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  specialistFilter,
  resultFilter,
  myReportsFilter,
  goalFilter,
  groupsFilter,
  purposeFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  goalFilter,
  groupsFilter,
  myReportsFilter,
  groupsFilter,
  purposeFilter,
  resultFilter,
  specialistFilter,
];

export { DASHBOARD_FILTER_CONFIG };
