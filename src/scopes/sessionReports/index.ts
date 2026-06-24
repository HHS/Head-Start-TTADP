import { createFiltersToScopes } from '../utils';
import { withRecipientId } from './recipientId';
import { withSessionId } from './sessionId';

export const topicToQuery = {
  recipientId: {
    ctn: (query: string[]) => withRecipientId(query),
  },
  sessionId: {
    in: (query: string[]) => withSessionId(query),
  },
};

export function sessionReportFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
