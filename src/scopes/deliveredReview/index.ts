import { createFiltersToScopes } from '../utils';
import {
  withinReportDeliveryDates,
  afterReportDeliveryDate,
  beforeReportDeliveryDate,
} from './reportDeliveryDate';

export const topicToQuery = {
  reportDeliveryDate: {
    bef: (query: string[]) => beforeReportDeliveryDate(query),
    aft: (query: string[]) => afterReportDeliveryDate(query),
    win: (query: string[]) => withinReportDeliveryDates(query),
    in: (query: string[]) => withinReportDeliveryDates(query),
  },
};

export function deliveredReviewFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
