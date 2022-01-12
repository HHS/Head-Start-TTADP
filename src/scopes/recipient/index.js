/* eslint-disable import/prefer-default-export */
import { map, pickBy } from 'lodash';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withRegion } from './region';

export const topicToQuery = {
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  region: {
    in: (query) => withRegion(query),
  },
  //   recipient: {
  //     in: (query) => withRecipientName(query),
  //     nin: (query) => withoutRecipientName(query),
  //   },
  //   recipientId: {
  //     in: (query) => withRecipientId(query),
  //   },
//   programSpecialist: {
//     in: (query) => withProgramSpecialist(query),
//     nin: (query) => withoutProgramSpecialist(query),
//   },
//   programType: {
//     in: (query) => withProgramTypes(query),
//     nin: (query) => withoutProgramTypes(query),
//   },
//   grantNumber: {
//     in: (query) => withGrantNumber(query),
//     nin: (query) => withoutGrantNumber(query),
//   },
//   stateCode: {
//     in: (query) => withStateCode(query),
//   },
};

export function recipientFiltersToScopes(filters) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic] = topicAndCondition.split('.');
    return topic in topicToQuery;
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition]([query].flat());
  });
}
