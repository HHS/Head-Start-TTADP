import { createFiltersToScopes } from '../utils';
import { afterCompleteDate, beforeCompleteDate, withinCompleteDates } from './completeDate';
import { withoutRegionId, withRegionId } from './regionId';
import { withoutReviewTypes, withReviewType } from './reviewType';

export const topicToQuery = {
  completeDate: {
    bef: (query: string[]) => beforeCompleteDate(query),
    aft: (query: string[]) => afterCompleteDate(query),
    win: (query: string[]) => withinCompleteDates(query),
    in: (query: string[]) => withinCompleteDates(query),
  },
  reviewType: {
    in: (query: string[]) => withReviewType(query),
    nin: (query: string[]) => withoutReviewTypes(query),
  },
  region: {
    in: (query: string[]) => withRegionId(query),
    nin: (query: string[]) => withoutRegionId(query),
  },
};

export function deliveredReviewFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
