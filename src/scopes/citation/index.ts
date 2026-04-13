import { map, pickBy } from 'lodash';
import { activeBefore, activeAfter, activeWithinDates } from './activeWithin';

export const topicToQuery = {
  activeWithin: {
    bef: (query) => activeBefore(query),
    aft: (query) => activeAfter(query),
    win: (query) => activeWithinDates(query),
    in: (query) => activeWithinDates(query),
  },
};

export function citationFiltersToScopes(filters) {
  const validFilters = pickBy(filters, (_query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    if (topic === 'startDate' || topic === 'endDate') {
      return condition in topicToQuery.activeWithin;
    }
    if (!(topic in topicToQuery)) {
      return false;
    }
    return condition in topicToQuery[topic];
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    if (topic === 'startDate' || topic === 'endDate') {
      return topicToQuery.activeWithin[condition]([query].flat());
    }
    return topicToQuery[topic][condition]([query].flat());
  });
}
