/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  goalFilter,
  groupsFilter,
  myReportsFilter,
  otherTtaStaffFilter,
  purposeFilter,
  resultFilter,
  specialistFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
  goalFilter,
  groupsFilter,
  myReportsFilter,
  otherTtaStaffFilter,
  purposeFilter,
  resultFilter,
  specialistFilter,
];

export { DASHBOARD_FILTER_CONFIG };
