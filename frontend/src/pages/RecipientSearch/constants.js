/* eslint-disable import/prefer-default-export */
import { regionFilter } from '../../components/filter/activityReportFilters';
import { groupsFilter } from '../../components/filter/grantFilters';

const RECIPIENT_SEARCH_FILTER_CONFIG = [
  groupsFilter,
  regionFilter,
];

// sort by display prop
RECIPIENT_SEARCH_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export { RECIPIENT_SEARCH_FILTER_CONFIG };
