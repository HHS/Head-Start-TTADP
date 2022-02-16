/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';
import { withoutStatus, withStatus } from './status';
import { withTopics, withoutTopics } from './topics';
import { withReasons, withoutReasons } from './reasons';
import { withRecipientId } from './recipientId';
import { withRegion, withoutRegion } from './region';

export const topicToQuery = {
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
  },
  status: {
    in: (query) => withStatus(query),
    nin: (query) => withoutStatus(query),
  },
  topic: {
    in: (query) => withTopics(query),
    nin: (query) => withoutTopics(query),
  },
  reason: {
    in: (query) => withReasons(query),
    nin: (query) => withoutReasons(query),
  },
  recipientId: {
    ctn: (query) => withRecipientId(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
};

export function goalsFiltersToScopes(filters) {
  return createFiltersToScopes(filters, topicToQuery);
}
