/* eslint-disable import/prefer-default-export */
import { regionFilter } from '../../components/filter/activityReportFilters';
import { groupsFilter } from '../../components/filter/grantFilters';

export const RECIPIENT_SEARCH_FILTER_CONFIG = [
  groupsFilter,
  regionFilter,
];
