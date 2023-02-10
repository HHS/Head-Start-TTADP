import { pickBy, map } from 'lodash';
import { WhereOptions } from 'sequelize';
import { Filters } from '../types';

export const topicToQuery = {};

export function grantsFiltersToScopes(filters: Filters) : WhereOptions {
  const validFilters = pickBy(filters, (query: string, topicAndCondition: string) => {
    const [topic, condition] = topicAndCondition.split('.');

    if (!(topic in topicToQuery)) {
      return false;
    }

    return condition in topicToQuery[topic];
  });

  return map(validFilters, (query: string, topicAndCondition: string) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition]([query].flat());
  });
}
