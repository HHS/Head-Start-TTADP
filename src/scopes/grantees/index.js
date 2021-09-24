/* eslint-disable import/prefer-default-export */
import { map, pickBy } from 'lodash';
import { beforeGrantStartDate, afterGrantStartDate, withinGrantStartDates } from './startDate';
import withGranteeRegion from './region';

export const topicToQuery = {
  startDate: {
    bef: (query) => beforeGrantStartDate(query),
    aft: (query) => afterGrantStartDate(query),
    win: (query) => {
      const [startDate, endDate] = query.split('-');
      return withinGrantStartDates(startDate, endDate);
    },
  },
  region: {
    in: (query) => withGranteeRegion(query),
  },
};

export function granteeReportFiltersToScopes(filters) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic] = topicAndCondition.split('.');
    return topic in topicToQuery;
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition](query);
  });
}
