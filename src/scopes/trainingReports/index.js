/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withRegion, withoutRegion } from './region';
import { withCollaborators } from './collaborators';
import { withCreators } from './creator';
import { withoutEventId, withEventId } from './eventId';
import { withGoalName, withoutGoalName } from './goalName';
import { withoutStandard, withStandard } from './standard';
import { withSessionId } from './sessionId';

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
  collaborators: {
    in: (query) => withCollaborators(query),
  },
  creator: {
    in: (query) => withCreators(query),
  },
  eventId: {
    ctn: (query) => withEventId(query),
    nctn: (query) => withoutEventId(query),
  },
  goalName: {
    ctn: (query) => withGoalName(query),
    nctn: (query) => withoutGoalName(query),
  },
  sessionId: {
    in: (query) => withSessionId(query),
  },
  standard: {
    in: (query) => withStandard(query),
    nin: (query) => withoutStandard(query),
  },
};

export function trainingReportsFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
