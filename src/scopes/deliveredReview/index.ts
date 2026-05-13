import { createFiltersToScopes } from '../utils';
import {
  afterReportDeliveryDate,
  beforeReportDeliveryDate,
  withinReportDeliveryDates,
} from './reportDeliveryDate';
import { withoutReviewTypes, withReviewType } from './reviewType';

export const topicToQuery = {
  reportDeliveryDate: {
    bef: (query: string[]) => beforeReportDeliveryDate(query),
    aft: (query: string[]) => afterReportDeliveryDate(query),
    win: (query: string[]) => withinReportDeliveryDates(query),
    in: (query: string[]) => withinReportDeliveryDates(query),
  },
  reviewType: {
    in: (query: string[]) => withReviewType(query),
    notIn: (query: string[]) => withoutReviewTypes(query),
  },
};

export function deliveredReviewFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
