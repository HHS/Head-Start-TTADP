import { createFiltersToScopes } from '../utils';
import { withCitationRecipient } from './citationRecipient';

export const topicToQuery = {
  citationRecipient: {
    in: (query: string[]) => withCitationRecipient(query),
  },
};

export function grantCitationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
