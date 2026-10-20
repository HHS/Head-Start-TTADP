import { createFiltersToScopes } from '../utils';
import { withoutRegion, withRegion } from './region';

export const topicToQuery = {
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
};

export function ttaRequestFiltersToScopes(filters, options, userId: number) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, []);
}
