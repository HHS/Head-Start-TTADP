import { createFiltersToScopes } from '../utils';
import { withCitationRecipient } from './citationRecipient';
import { withoutRegion, withRegion } from './regionId';

export const topicToQuery = {
  citationRecipient: {
    in: (query: string[]) => withCitationRecipient(query),
  },
  region: {
    in: (query: string[]) => withRegion(query),
    nin: (query: string[]) => withoutRegion(query),
  },
};

export function grantCitationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
