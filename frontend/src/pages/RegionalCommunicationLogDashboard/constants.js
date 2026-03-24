/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
  myReportsFilter,
  resultFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [communicationDateFilter, resultFilter, myReportsFilter];

export { DASHBOARD_FILTER_CONFIG };
