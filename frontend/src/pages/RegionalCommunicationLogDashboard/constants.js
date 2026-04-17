/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  goalFilter,
  groupsFilter,
  myReportsFilter,
  purposeFilter,
  resultFilter,
  specialistFilter,
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
