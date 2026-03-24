/* eslint-disable import/prefer-default-export */

import { map, pickBy } from 'lodash';
import sequelize, { Op } from 'sequelize';
import { activeAfter, activeBefore, activeWithinDates } from './activeWithin';
import { withGoalName, withoutGoalName } from './goalName';
import { withGoalResponse, withoutGoalResponse } from './goalResponse';
import { withGrantNumber, withoutGrantNumber } from './grantNumber';
import { withGrantStatus, withoutGrantStatus } from './grantStatus';
import { withGroup, withoutGroup } from './group';
import { afterLastTTA, beforeLastTTA, withinLastTTA } from './lastTTA';
import { withoutProgramSpecialist, withProgramSpecialist } from './programSpecialist';
import { withoutProgramTypes, withProgramTypes } from './programType';
import { withoutRecipientName, withRecipientName } from './recipient';
import { withoutRecipientId, withRecipientId } from './recipientId';
import { noActivityWithin } from './recipientsWithoutTTA';
import { withoutRegion, withRegion } from './region';
import { withStateCode } from './stateCode';

export const topicToQuery = {
  recipient: {
    ctn: (query) => withRecipientName(query),
    nctn: (query) => withoutRecipientName(query),
  },
  recipientId: {
    in: (query) => withRecipientId(query),
    nin: (query) => withoutRecipientId(query),
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
  lastTTA: {
    bef: (query) => beforeLastTTA(query),
    aft: (query) => afterLastTTA(query),
    win: (query) => withinLastTTA(query),
    in: (query) => withinLastTTA(query),
  },
  recipientsWithoutTTA: {
    win: (query) => noActivityWithin(query),
    in: (query) => noActivityWithin(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  group: {
    in: (query, _options, userId) => withGroup(query, userId),
    nin: (query, _options, userId) => withoutGroup(query, userId),
  },
  goalName: {
    ctn: (query) => withGoalName(query),
    nctn: (query) => withoutGoalName(query),
  },
  grantStatus: {
    in: (query) => withGrantStatus(query),
    nin: (query) => withoutGrantStatus(query),
  },
  goalResponse: {
    in: (query) => withGoalResponse(query),
    nin: (query) => withoutGoalResponse(query),
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

  const scopes = map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');

    if ((topic === 'startDate' || topic === 'endDate') && isSubset) {
      return topicToQuery.activeWithin[condition]([query].flat());
    }

    return topicToQuery[topic][condition]([query].flat(), options, userId);
  });

  const whereClauses = scopes.map((scope) => scope.where);
  const includeClauses = scopes.map((scope) => scope.include).filter(Boolean);

  return {
    where: whereClauses.length > 0 ? { [Op.and]: whereClauses } : {},
    include: includeClauses.length > 0 ? includeClauses : [],
  };
}
