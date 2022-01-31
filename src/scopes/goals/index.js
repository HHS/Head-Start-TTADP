/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';
import { withoutStatus, withStatus } from './status';
import { withTopics, withoutTopics } from './topics';
import { withReasons, withoutReasons } from './reasons';

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
};

export function goalsReportFiltersToScopes(filters) {
  return createFiltersToScopes(filters, topicToQuery);
}
