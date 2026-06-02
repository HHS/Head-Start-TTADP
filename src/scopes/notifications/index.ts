import { createFiltersToScopes } from '../utils';
import { afterCreateDate, beforeCreateDate, withinCreateDate } from './createdAt';
import { withUserId } from './userId';

export const topicToQuery = {
  createdAt: {
    bef: (query: string[]) => beforeCreateDate(query),
    aft: (query: string[]) => afterCreateDate(query),
    win: (query: string[]) => withinCreateDate(query),
    in: (query: string[]) => withinCreateDate(query),
  },
  userId: {
    in: (query: string[]) => withUserId(query),
  },
};

export function notificationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
