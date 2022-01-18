/* eslint-disable import/prefer-default-export */
import { createFiltersToScopes } from '../utils';
import { withRecipientName, withoutRecipientName } from './recipient';
import withRecipientId from './recipientId';
import { withoutReportIds, withReportIds } from './reportId';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withoutTopics, withTopics } from './topic';
import { beforeLastSaveDate, afterLastSaveDate, withinLastSaveDates } from './updatedAt';
import { withAuthor, withoutAuthor } from './author';
import { withCollaborators, withoutCollaborators } from './collaborators';
import { withoutCalculatedStatus, withCalculatedStatus } from './calculatedStatus';
import { withProgramSpecialist, withoutProgramSpecialist } from './programSpecialist';
import { withRole, withoutRole } from './role';
import { withRegion, withoutRegion } from './region';
import { withoutProgramTypes, withProgramTypes } from './programType';
import { withoutTargetPopulations, withTargetPopulations } from './targetPopulations';
import { withoutReason, withReason } from './reason';
import { withoutGrantNumber, withGrantNumber } from './grantNumber';
import withStateCode from './stateCode';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';

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
    in: (query) => withTopics(query),
    nin: (query) => withoutTopics(query),
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
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  targetPopulations: {
    in: (query) => withTargetPopulations(query),
    nin: (query) => withoutTargetPopulations(query),
  },
  reason: {
    in: (query) => withReason(query),
    nin: (query) => withoutReason(query),
  },
  grantNumber: {
    ctn: (query) => withGrantNumber(query),
    nctn: (query) => withoutGrantNumber(query),
  },
  stateCode: {
    ctn: (query) => withStateCode(query),
  },
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
  },
};

export function activityReportsFiltersToScopes(filters) {
  return createFiltersToScopes(filters, topicToQuery);
}
