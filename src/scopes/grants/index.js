/* eslint-disable import/prefer-default-export */
import sequelize, { Op } from 'sequelize'
import { map, pickBy } from 'lodash'
import { activeBefore, activeAfter, activeWithinDates } from './activeWithin'
import { withRegion, withoutRegion } from './region'
import { withRecipientName, withoutRecipientName } from './recipient'
import { withProgramSpecialist, withoutProgramSpecialist } from './programSpecialist'
import { withProgramTypes, withoutProgramTypes } from './programType'
import { withStateCode } from './stateCode'
import { withGrantNumber, withoutGrantNumber } from './grantNumber'
import { withGroup, withoutGroup } from './group'
import { noActivityWithin } from './recipientsWithoutTTA'
import { withGoalName, withoutGoalName } from './goalName'
import { withGrantStatus, withoutGrantStatus } from './grantStatus'
import { withGoalResponse, withoutGoalResponse } from './goalResponse'

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
}

export function grantsFiltersToScopes(filters, options, userId) {
  const isSubset = options && options.subset
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.')
    if ((topic === 'startDate' || topic === 'endDate') && isSubset) {
      return condition in topicToQuery.activeWithin
    }

    if (!(topic in topicToQuery)) {
      return false
    }

    return condition in topicToQuery[topic]
  })

  const scopes = map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.')

    if ((topic === 'startDate' || topic === 'endDate') && isSubset) {
      return topicToQuery.activeWithin[condition]([query].flat())
    }

    return topicToQuery[topic][condition]([query].flat(), options, userId)
  })

  const whereClauses = scopes.map((scope) => scope.where)
  const includeClauses = scopes.map((scope) => scope.include).filter(Boolean)

  return {
    where: whereClauses.length > 0 ? { [Op.and]: whereClauses } : {},
    include: includeClauses.length > 0 ? includeClauses : [],
  }
}
