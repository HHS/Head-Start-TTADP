/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withCollaborators } from './collaborators';
import { withCreators } from './creator';
import { withEventId, withoutEventId } from './eventId';
import { withGoalName, withoutGoalName } from './goalName';
import { withoutRegion, withRegion } from './region';
import { withoutStandard, withStandard } from './standard';
import { afterStartDate, beforeStartDate, withinStartDates } from './startDate';

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
  standard: {
    in: (query) => withStandard(query),
    nin: (query) => withoutStandard(query),
  },
};

export function trainingReportsFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
