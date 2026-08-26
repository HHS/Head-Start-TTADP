/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withCollaborators } from './collaborators';
import { withCreators } from './creator';
import { afterEndDate, beforeEndDate, withinEndDates } from './endDate';
import { withEventId, withoutEventId } from './eventId';
import { withGoalName, withoutGoalName } from './goalName';
import { withoutTrMyReports, withTrMyReports } from './myReports';
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
  endDate: {
    bef: (query) => beforeEndDate(query),
    aft: (query) => afterEndDate(query),
    win: (query) => withinEndDates(query),
    in: (query) => withinEndDates(query),
  },
  myReports: {
    in: (query, options, userId) => withTrMyReports(query, options, userId),
    nin: (query, options, userId) => withoutTrMyReports(query, options, userId),
  },
};

export function trainingReportsFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
