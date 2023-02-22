/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';
import { withoutStatus, withStatus } from './status';
import { withTopics, withoutTopics } from './topics';
import { withReasons, withoutReasons } from './reasons';
import { withRecipientId } from './recipientId';
import { withRegion, withoutRegion } from './region';
import { withRoles, withoutRoles } from './role';
import { containsGrantNumber, doesNotContainGrantNumber, withGrantNumber, withoutGrantNumber } from './grantNumber';
import { afterStartDate, beforeStartDate, withinStartDates } from './startDate';
import { withMyReports, withoutMyReports } from './myReports';

export const topicToQuery = {
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
    in: (query) => withinCreateDate(query),
  },
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  status: {
    in: (query) => withStatus(query),
    nin: (query) => withoutStatus(query),
  },
  topic: {
    in: (query, options) => withTopics(query, options),
    nin: (query, options) => withoutTopics(query, options),
  },
  reason: {
    in: (query, options) => withReasons(query, options),
    nin: (query, options) => withoutReasons(query, options),
  },
  recipientId: {
    ctn: (query) => withRecipientId(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  role: {
    in: (query) => withRoles(query),
    nin: (query) => withoutRoles(query),
  },
  grantNumber: {
    in: (query) => withGrantNumber(query),
    nin: (query) => withoutGrantNumber(query),
    ctn: (query) => containsGrantNumber(query),
    nctn: (query) => doesNotContainGrantNumber(query),
  },
  myReports: {
    in: (query, options, userId) => withMyReports(query, options, userId),
    nin: (query, options, userId) => withoutMyReports(query, options, userId),
  },
};

export function goalsFiltersToScopes(filters, options, userId) {
  return createFiltersToScopes(filters, topicToQuery, options, userId);
}
