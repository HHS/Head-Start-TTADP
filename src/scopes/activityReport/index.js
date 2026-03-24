/* eslint-disable import/prefer-default-export */

import { withoutStatus } from '../goals/status';
import { createFiltersToScopes } from '../utils';
import {
  withActivityReportGoalResponse,
  withoutActivityReportGoalResponse,
} from './activityReportGoalResponse';
import { withAuthor, withoutAuthor } from './author';
import { withCalculatedStatus, withoutCalculatedStatus } from './calculatedStatus';
import { withCollaborators, withoutCollaborators } from './collaborators';
import { afterCreateDate, beforeCreateDate, withinCreateDate } from './createDate';
import { withDeliveryMethod, withoutDeliveryMethod } from './deliveryMethod';
import { afterEndDate, beforeEndDate, withinEndDate } from './endDate';
import { withGoalName, withoutGoalName } from './goalName';
import { withGrantNumber, withoutGrantNumber } from './grantNumber';
import { withGrantStatus, withoutGrantStatus } from './grantStatus';
import { withGroup, withoutGroup } from './group';
import { withMyReports, withoutMyReports } from './myReports';
import { withOtherEntities, withoutOtherEntities } from './otherEntities';
import { withoutParticipants, withParticipants } from './participants';
import { withoutProgramSpecialist, withProgramSpecialist } from './programSpecialist';
import { withoutProgramTypes, withProgramTypes } from './programType';
import { withoutReason, withReason } from './reason';
import { withoutRecipientName, withRecipientName } from './recipient';
import withRecipientId from './recipientId';
import { withoutRegion, withRegion } from './region';
import { withoutReportIds, withReportIds } from './reportId';
import { withoutReportText, withReportText } from './reportText';
import { withoutResourceAttachment, withResourceAttachment } from './resourceAttachment';
import { withoutResourceUrl, withResourceUrl } from './resourceUrl';
import { withoutRole, withRole } from './role';
import { withSingleOrMultiRecipients } from './singleOrMultiRecipient';
import { bothCollaboratorsAndCreators, onlyCollaborators, onlyCreators } from './specialistName';
import { afterStartDate, beforeStartDate, withinStartDates } from './startDate';
import withStateCode from './stateCode';
import { withoutTargetPopulations, withTargetPopulations } from './targetPopulations';
import { withoutTopics, withTopics } from './topic';
import { withoutTtaType, withTtaType } from './ttaType';
import { afterLastSaveDate, beforeLastSaveDate, withinLastSaveDates } from './updatedAt';

export const topicToQuery = {
  reportId: {
    ctn: (query) => withReportIds(query),
    nctn: (query) => withoutReportIds(query),
  },
  recipient: {
    ctn: (query) => withRecipientName(query),
    nctn: (query) => withoutRecipientName(query),
  },
  recipientId: {
    ctn: (query) => withRecipientId(query),
  },
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  lastSaved: {
    bef: (query) => beforeLastSaveDate(query),
    aft: (query) => afterLastSaveDate(query),
    win: (query) => withinLastSaveDates(query),
  },
  role: {
    in: (query) => withRole(query),
    nin: (query) => withoutRole(query),
  },
  creator: {
    ctn: (query) => withAuthor(query),
    nctn: (query) => withoutAuthor(query),
  },
  topic: {
    in: (query, _options, _userId, validTopics) =>
      withTopics(query, _options, _userId, validTopics),
    nin: (query, _options, _userId, validTopics) =>
      withoutTopics(query, _options, _userId, validTopics),
  },
  collaborators: {
    ctn: (query) => withCollaborators(query),
    nctn: (query) => withoutCollaborators(query),
  },
  calculatedStatus: {
    in: (query) => withCalculatedStatus(query),
    nin: (query) => withoutCalculatedStatus(query),
  },
  programSpecialist: {
    ctn: (query) => withProgramSpecialist(query),
    nctn: (query) => withoutProgramSpecialist(query),
  },
  programType: {
    in: (query) => withProgramTypes(query),
    nin: (query) => withoutProgramTypes(query),
  },
  myReports: {
    in: (query, options, userId) => withMyReports(query, options, userId),
    nin: (query, options, userId) => withoutMyReports(query, options, userId),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  targetPopulations: {
    in: (query) => withTargetPopulations(query),
    nin: (query) => withoutTargetPopulations(query),
  },
  singleOrMultiRecipients: {
    in: (query) => withSingleOrMultiRecipients(query),
  },
  reason: {
    in: (query) => withReason(query),
    nin: (query) => withoutReason(query),
  },
  grantStatus: {
    in: (query) => withGrantStatus(query),
    nin: (query) => withoutGrantStatus(query),
  },
  participants: {
    in: (query) => withParticipants(query),
    nin: (query) => withoutParticipants(query),
  },
  grantNumber: {
    ctn: (query) => withGrantNumber(query),
    nctn: (query) => withoutGrantNumber(query),
  },
  stateCode: {
    ctn: (query) => withStateCode(query),
  },
  group: {
    in: (query, _options, userId) => withGroup(query, userId),
    nin: (query, _options, userId) => withoutGroup(query, userId),
  },
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
  },
  endDate: {
    bef: (query) => beforeEndDate(query),
    aft: (query) => afterEndDate(query),
    win: (query) => withinEndDate(query),
    in: (query) => withinEndDate(query),
  },
  goalName: {
    ctn: (query) => withGoalName(query),
    nctn: (query) => withoutGoalName(query),
  },
  otherEntities: {
    in: (query) => withOtherEntities(query),
    nin: (query) => withoutOtherEntities(query),
  },
  reportText: {
    ctn: (query) => withReportText(query),
    nctn: (query) => withoutReportText(query),
  },
  ttaType: {
    in: (query) => withTtaType(query),
    nin: (query) => withoutTtaType(query),
  },
  deliveryMethod: {
    in: (query) => withDeliveryMethod(query),
    nin: (query) => withoutDeliveryMethod(query),
  },
  resourceAttachment: {
    ctn: (query) => withResourceAttachment(query),
    nctn: (query) => withoutResourceAttachment(query),
  },
  resourceUrl: {
    ctn: (query) => withResourceUrl(query),
    nctn: (query) => withoutResourceUrl(query),
  },
  specialistName: {
    collaborator: (query) => onlyCollaborators(query),
    creator: (query) => onlyCreators(query),
    both: (query) => bothCollaboratorsAndCreators(query),
  },
  activityReportGoalResponse: {
    in: (query) => withActivityReportGoalResponse(query),
    nin: (query) => withoutActivityReportGoalResponse(query),
  },
};

export function activityReportsFiltersToScopes(filters, options, userId, validTopics) {
  return createFiltersToScopes(filters, topicToQuery, options, userId, validTopics);
}
