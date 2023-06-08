/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withRegion, withoutRegion } from './region';

export const topicToQuery = {
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
};

export function trainingReportsFiltersToScopes(filters, options, userId) {
  return createFiltersToScopes(filters, topicToQuery, options, userId);
}
