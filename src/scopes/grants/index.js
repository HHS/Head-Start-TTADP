/* eslint-disable import/prefer-default-export */
import { map, pickBy } from 'lodash';
import { activeBefore, activeAfter, activeWithinDates } from './activeWithin';
import { withRegion, withoutRegion } from './region';
import { withRecipientName, withoutRecipientName } from './recipient';
import { withProgramSpecialist, withoutProgramSpecialist } from './programSpecialist';
import { withProgramTypes, withoutProgramTypes } from './programType';
import { withStateCode } from './stateCode';
import { withGrantNumber, withoutGrantNumber } from './grantNumber';
import { withGroup, withoutGroup } from './group';

export const topicToQuery = {
  recipient: {
    ctn: (query) => withRecipientName(query),
    nctn: (query) => withoutRecipientName(query),
  },
  programSpecialist: {
    ctn: (query) => withProgramSpecialist(query),
    nctn: (query) => withoutProgramSpecialist(query),
  },
  programType: {
    in: (query) => withProgramTypes(query),
    nin: (query) => withoutProgramTypes(query),
  },
  grantNumber: {
    ctn: (query) => withGrantNumber(query),
    nctn: (query) => withoutGrantNumber(query),
  },
  stateCode: {
    ctn: (query) => withStateCode(query),
  },
  activeWithin: {
    bef: (query) => activeBefore(query),
    aft: (query) => activeAfter(query),
    win: (query) => activeWithinDates(query),
    in: (query) => activeWithinDates(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  group: {
    in: (query, options, userId) => withGroup(query, userId),
    nin: (query, options, userId) => withoutGroup(query, userId),
  },
};

export function grantsFiltersToScopes(filters, options, userId) {
  const isSubset = options && options.subset;
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');

    if ((topic === 'startDate' || topic === 'endDate') && isSubset) {
      return condition in topicToQuery.activeWithin;
    }

    if (!(topic in topicToQuery)) {
      return false;
    }

    return condition in topicToQuery[topic];
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');

    if ((topic === 'startDate' || topic === 'endDate') && isSubset) {
      return topicToQuery.activeWithin[condition]([query].flat());
    }

    return topicToQuery[topic][condition]([query].flat(), options, userId);
  });
}
