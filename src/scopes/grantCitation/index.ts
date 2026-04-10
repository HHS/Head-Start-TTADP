import { createFiltersToScopes } from '../utils';
import { withCitationRecipient } from './citationRecipient';
import { withId } from './id';

export const topicToQuery = {
  id: {
    in: (query: string[]) => withId(query),
  },
  citationRecipient: {
    in: (query: string[]) => withCitationRecipient(query),
  },
};

export function grantCitationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
