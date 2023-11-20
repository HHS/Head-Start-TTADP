/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withRegion, withoutRegion } from './region';
import { withCollaborators } from './collaborators';
import { withCreators } from './creator';
import { withoutEventId, withEventId } from './eventId';

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
};

export function trainingReportsFiltersToScopes(filters, options, userId) {
  return createFiltersToScopes(filters, topicToQuery, options, userId);
}
