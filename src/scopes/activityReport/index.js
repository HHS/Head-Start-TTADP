/* eslint-disable import/prefer-default-export */
import { map, pickBy } from 'lodash';

import { withGranteeName, withoutGranteeName } from './grantee';
import withGranteeId from './granteeId';
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

export const topicToQuery = {
  reportId: {
    in: (query) => withReportIds(query),
    nin: (query) => withoutReportIds(query),
  },
  grantee: {
    in: (query) => withGranteeName(query),
    nin: (query) => withoutGranteeName(query),
  },
  granteeId: {
    in: (query) => withGranteeId(query),
  },
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => {
      const [startDate, endDate] = query.split('-');
      return withinStartDates(startDate, endDate);
    },
  },
  lastSaved: {
    bef: (query) => beforeLastSaveDate(query),
    aft: (query) => afterLastSaveDate(query),
    win: (query) => {
      const [startDate, endDate] = query.split('-');
      return withinLastSaveDates(startDate, endDate);
    },
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
  region: {
    in: (query) => withRegion(query),
  },
};

export function activityReportsFiltersToScopes(filters) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic] = topicAndCondition.split('.');
    return topic in topicToQuery;
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition](query);
  });
}
