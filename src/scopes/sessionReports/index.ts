/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withSessionId } from './sessionId';

export const topicToQuery = {
  sessionId: {
    in: (query: string[]) => withSessionId(query),
  },
};

export function sessionReportFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
