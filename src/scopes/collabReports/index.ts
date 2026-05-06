/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withConductMethod, withoutConductMethod } from './conductMethod';
import { withGoal, withoutGoal } from './goal';
import { withId, withoutId } from './id';
import { withoutRegion, withRegion } from './region';

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
  conductMethod: {
    in: (query) => withConductMethod(query),
    nin: (query) => withoutConductMethod(query),
  },
};

export function collabReportFiltersToScopes(filters, options, userId: number) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, []);
}
