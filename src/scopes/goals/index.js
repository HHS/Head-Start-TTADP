import { createFiltersToScopes } from '../utils'
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate'
import { withoutStatus, withStatus } from './status'
import { withTopics, withoutTopics } from './topics'
import { withReasons, withoutReasons } from './reasons'
import { withRecipientName, withoutRecipientName } from './recipient'
import { withRecipientId } from './recipientId'
import { withRegion, withoutRegion } from './region'
import { containsGrantNumber, doesNotContainGrantNumber, withGrantNumber, withoutGrantNumber } from './grantNumber'
import { afterStartDate, beforeStartDate, withinStartDates } from './startDate'
import { afterEndDate, beforeEndDate, withinEndDates } from './endDate'
import { withMyReports, withoutMyReports } from './myReports'
import { withParticipants, withoutParticipants } from './participants'
import { withoutTtaType, withTtaType } from './ttaType'
import { withoutProgramSpecialist, withProgramSpecialist } from './programSpecialist'
import { withProgramTypes, withoutProgramTypes } from './programType'
import { withoutReportIds, withReportIds } from './reportId'
import withStateCode from './stateCode'
import { withReportText, withoutReportText } from './reportText'
import { withoutTargetPopulations, withTargetPopulations } from './targetPopulations'
import { withGoalType, withoutGoalType } from './goalType'
import { withGroup, withoutGroup } from './group'
import { withResourceUrl, withoutResourceUrl } from './resouceUrl'
import { withResourceAttachment, withoutResourceAttachment } from './resourceAttachment'
import { withEnteredByRole, withoutEnteredByRole } from './enteredByRole'
import { withGoalName, withoutGoalName } from './goalName'
import { withGoalResponse, withoutGoalResponse } from './goalResponse'

export const topicToQuery = {
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
    in: (query) => withinCreateDate(query),
  },
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  endDate: {
    bef: (query) => beforeEndDate(query),
    aft: (query) => afterEndDate(query),
    win: (query) => withinEndDates(query),
    in: (query) => withinEndDates(query),
  },
  goalType: {
    in: (query) => withGoalType(query),
    nin: (query) => withoutGoalType(query),
  },
  status: {
    in: (query) => withStatus(query),
    nin: (query) => withoutStatus(query),
  },
  topic: {
    in: (query, options, _userId, validTopics) => withTopics(query, options, _userId, validTopics),
    nin: (query, options, _userId, validTopics) => withoutTopics(query, options, _userId, validTopics),
  },
  reason: {
    in: (query, options) => withReasons(query, options),
    nin: (query, options) => withoutReasons(query, options),
  },
  enteredByRole: {
    in: (query, options) => withEnteredByRole(query, options),
    nin: (query, options) => withoutEnteredByRole(query, options),
  },
  recipientId: {
    ctn: (query) => withRecipientId(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  group: {
    in: (query, _options, userId) => withGroup(query, userId),
    nin: (query, _options, userId) => withoutGroup(query, userId),
  },
  grantNumber: {
    in: (query) => withGrantNumber(query),
    nin: (query) => withoutGrantNumber(query),
    ctn: (query) => containsGrantNumber(query),
    nctn: (query) => doesNotContainGrantNumber(query),
  },
  myReports: {
    in: (query, options, userId) => withMyReports(query, options, userId),
    nin: (query, options, userId) => withoutMyReports(query, options, userId),
  },
  participants: {
    in: (query) => withParticipants(query),
    nin: (query) => withoutParticipants(query),
  },
  programSpecialist: {
    ctn: (query) => withProgramSpecialist(query),
    nctn: (query) => withoutProgramSpecialist(query),
  },
  programType: {
    in: (query) => withProgramTypes(query),
    nin: (query) => withoutProgramTypes(query),
  },
  recipient: {
    ctn: (query) => withRecipientName(query),
    nctn: (query) => withoutRecipientName(query),
  },
  reportId: {
    ctn: (query) => withReportIds(query),
    nctn: (query) => withoutReportIds(query),
  },
  reportText: {
    ctn: (query) => withReportText(query),
    nctn: (query) => withoutReportText(query),
  },
  resourceUrl: {
    ctn: (query) => withResourceUrl(query),
    nctn: (query) => withoutResourceUrl(query),
  },
  resourceAttachment: {
    ctn: (query) => withResourceAttachment(query),
    nctn: (query) => withoutResourceAttachment(query),
  },
  targetPopulations: {
    in: (query) => withTargetPopulations(query),
    nin: (query) => withoutTargetPopulations(query),
  },
  ttaType: {
    in: (query) => withTtaType(query),
    nin: (query) => withoutTtaType(query),
  },
  stateCode: {
    ctn: (query) => withStateCode(query),
  },
  goalName: {
    ctn: (query) => withGoalName(query),
    nctn: (query) => withoutGoalName(query),
  },
  goalResponse: {
    in: (query) => withGoalResponse(query),
    nin: (query) => withoutGoalResponse(query),
  },
}

export function goalsFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics)
}
