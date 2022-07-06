/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';
import { withoutStatus, withStatus } from './status';
import { withTopics, withoutTopics } from './topics';
import { withReasons, withoutReasons } from './reasons';
import { withRecipientId } from './recipientId';
import { withRegion, withoutRegion } from './region';
import { withRoles, withoutRoles } from './role';
import { withGrantNumber, withoutGrantNumber } from './grantNumber';

export const topicToQuery = {
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
    in: (query) => withinCreateDate(query),
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
  },
};

export function goalsFiltersToScopes(filters, options) {
  return createFiltersToScopes(filters, topicToQuery, options);
}
