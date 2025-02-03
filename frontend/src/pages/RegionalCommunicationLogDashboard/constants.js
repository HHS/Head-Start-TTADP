/* eslint-disable import/prefer-default-export */
import {
  communicationDateFilter,
} from '../../components/filter/communicationLogFilters';

const DASHBOARD_FILTER_CONFIG = [
  communicationDateFilter,
];

// sort by display prop
DASHBOARD_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { DASHBOARD_FILTER_CONFIG };
