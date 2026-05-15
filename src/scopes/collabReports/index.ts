import { createFiltersToScopes } from '../utils';
import { withActivityPurpose, withoutActivityPurpose } from './activityPurpose';
import { withActivityType, withoutActivityType } from './activityType';
import { withConductMethod, withoutConductMethod } from './conductMethod';
import { withGoal, withoutGoal } from './goal';
import { withId, withoutId } from './id';
import { withoutRegion, withRegion } from './region';
import { afterStartDate, beforeStartDate, withinStartDate } from './startDate';
import { withoutStateCode, withStateCode } from './stateCode';

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
  stateCode: {
    in: (query) => withStateCode(query),
    nin: (query) => withoutStateCode(query),
  },
  conductMethod: {
    in: (query) => withConductMethod(query),
    nin: (query) => withoutConductMethod(query),
  },
  activityType: {
    in: (query) => withActivityType(query),
    nin: (query) => withoutActivityType(query),
  },
  activityPurpose: {
    in: (query) => withActivityPurpose(query),
    nin: (query) => withoutActivityPurpose(query),
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
