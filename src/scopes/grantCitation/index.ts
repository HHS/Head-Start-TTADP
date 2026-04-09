import { createFiltersToScopes } from '../utils';
import { withId } from './id';

export const topicToQuery = {
  id: {
    in: (query: string[]) => withId(query),
  },
};

export function grantCitationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
