/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withGoal, withoutGoal } from './goal';
import { withId, withoutId } from './id';
import { withoutRegion, withRegion } from './region';
import { afterStartDate, beforeStartDate, withinStartDate } from './startDate';

export const topicToQuery = {
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  id: {
    in: (query) => withId(query),
    nin: (query) => withoutId(query),
  },
  goal: {
    in: (query) => withGoal(query),
    nin: (query) => withoutGoal(query),
  },
  startDate: {
    bef: (query: string[]) => beforeStartDate(query),
    aft: (query: string[]) => afterStartDate(query),
    win: (query: string[]) => withinStartDate(query),
    in: (query: string[]) => withinStartDate(query),
  },
};

export function collabReportFiltersToScopes(filters, options, userId: number) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, []);
}
