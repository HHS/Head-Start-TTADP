/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeGrantStartDate, afterGrantStartDate, withinGrantStartDates } from './startDate';
import withGrantsRegion from './region';

export const topicToQuery = {
  startDate: {
    bef: (query) => beforeGrantStartDate(query),
    aft: (query) => afterGrantStartDate(query),
    win: (query) => withinGrantStartDates(query),
  },
  region: {
    in: (query) => withGrantsRegion(query),
  },
};

export function grantsReportFiltersToScopes(filters) {
  return createFiltersToScopes(filters, topicToQuery);
}
