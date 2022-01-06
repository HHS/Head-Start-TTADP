/* eslint-disable import/prefer-default-export */
import { map, pickBy } from 'lodash';
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
import withRegion from './region';
import { withoutProgramTypes, withProgramTypes } from './programType';
import { withoutTargetPopulations, withTargetPopulations } from './targetPopulations';
import { withoutReason, withReason } from './reason';
import { withoutGrantNumber, withGrantNumber } from './grantNumber';
import withStateCode from './stateCode';
import { beforeCreateDate, afterCreateDate, withinCreateDate } from './createDate';

export const topicToQuery = {
  reportId: {
    in: (query) => withReportIds(query),
    nin: (query) => withoutReportIds(query),
  },
  recipient: {
    in: (query) => withRecipientName(query),
    nin: (query) => withoutRecipientName(query),
  },
  recipientId: {
    in: (query) => withRecipientId(query),
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
    in: (query) => withAuthor(query),
    nin: (query) => withoutAuthor(query),
  },
  topic: {
    in: (query) => withTopics(query),
    nin: (query) => withoutTopics(query),
  },
  collaborators: {
    in: (query) => withCollaborators(query),
    nin: (query) => withoutCollaborators(query),
  },
  calculatedStatus: {
    in: (query) => withCalculatedStatus(query),
    nin: (query) => withoutCalculatedStatus(query),
  },
  programSpecialist: {
    in: (query) => withProgramSpecialist(query),
    nin: (query) => withoutProgramSpecialist(query),
  },
  programType: {
    in: (query) => withProgramTypes(query),
    nin: (query) => withoutProgramTypes(query),
  },
  region: {
    in: (query) => withRegion(query),
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
    in: (query) => withGrantNumber(query),
    nin: (query) => withoutGrantNumber(query),
  },
  stateCode: {
    in: (query) => withStateCode(query),
  },
  createDate: {
    bef: (query) => beforeCreateDate(query),
    aft: (query) => afterCreateDate(query),
    win: (query) => withinCreateDate(query),
  },
};

export function activityReportsFiltersToScopes(filters) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic] = topicAndCondition.split('.');
    return topic in topicToQuery;
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition]([query].flat());
  });
}
