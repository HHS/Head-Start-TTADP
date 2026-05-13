import { createFiltersToScopes } from '../utils';
import { withCitationRecipient } from './citationRecipient';
import { withFindingType, withoutFindingType } from './findingType';
import { withoutRegion, withRegion } from './regionId';

export const topicToQuery = {
  citationRecipient: {
    in: (query: string[]) => withCitationRecipient(query),
  },
  regionId: {
    in: (query: string[]) => withRegion(query),
    notIn: (query: string[]) => withoutRegion(query),
  },
  findingType: {
    in: (query: string[]) => withFindingType(query),
    notIn: (query: string[]) => withoutFindingType(query),
  },
};

export function grantCitationFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
