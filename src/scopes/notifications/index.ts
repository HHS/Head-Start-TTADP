import { createFiltersToScopes } from '../utils';
import { afterCreateDate, beforeCreateDate, withinCreateDate } from './createdAt';
import { withNotificationType, withoutNotificationType } from './notificationType';
import { withUserId } from './userId';

export const topicToQuery = {
  createdAt: {
    bef: (query: string[]) => beforeCreateDate(query),
    aft: (query: string[]) => afterCreateDate(query),
    win: (query: string[]) => withinCreateDate(query),
    in: (query: string[]) => withinCreateDate(query),
  },
  notificationType: {
    in: (query: string[]) => withNotificationType(query),
    nin: (query: string[]) => withoutNotificationType(query),
  },
  userId: {
    in: (query: string[]) => withUserId(query),
  },
};

export function notificationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
