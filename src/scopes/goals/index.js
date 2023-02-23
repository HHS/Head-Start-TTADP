/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';
import { withoutStatus, withStatus } from './status';
import { withTopics, withoutTopics } from './topics';
import { withReasons, withoutReasons } from './reasons';
import { withRecipientName, withoutRecipientName } from './recipient';
import { withRecipientId } from './recipientId';
import { withRegion, withoutRegion } from './region';
import { withRoles, withoutRoles } from './role';
import { containsGrantNumber, doesNotContainGrantNumber, withGrantNumber, withoutGrantNumber } from './grantNumber';
import { afterStartDate, beforeStartDate, withinStartDates } from './startDate';
import { afterEndDate, beforeEndDate, withinEndDates } from './endDate';
import { withMyReports, withoutMyReports } from './myReports';
import { withParticipants, withoutParticipants } from './participants';
import { withoutTtaType, withTtaType } from './ttaType';
import { withoutProgramSpecialist, withProgramSpecialist } from './programSpecialist';
import { withProgramTypes, withoutProgramTypes } from './programType';
import { withoutReportIds, withReportIds } from './reportId';
import withStateCode from './stateCode';
import { withReportText, withoutReportText } from './reportText';
import { withoutTargetPopulations, withTargetPopulations } from './targetPopulations';

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
  status: {
    in: (query) => withStatus(query),
    nin: (query) => withoutStatus(query),
  },
  topic: {
    in: (query, options) => withTopics(query, options),
    nin: (query, options) => withoutTopics(query, options),
  },
  reason: {
    in: (query, options) => withReasons(query, options),
    nin: (query, options) => withoutReasons(query, options),
  },
  recipientId: {
    ctn: (query) => withRecipientId(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  role: {
    in: (query) => withRoles(query),
    nin: (query) => withoutRoles(query),
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
};

export function goalsFiltersToScopes(filters, options, userId) {
  return createFiltersToScopes(filters, topicToQuery, options, userId);
}
