/* eslint-disable import/prefer-default-export */
import { map, pickBy } from 'lodash';

import { withGranteeName, withoutGranteeName } from './grantee';
import { withoutReportIds, withReportIds } from './reportId';
import { beforeStartDate, afterStartDate, withinStartDates } from './startDate';
import { withoutTopics, withTopics } from './topic';
import { beforeLastSaveDate, afterLastSaveDate, withinLastSaveDates } from './updatedAt';
import { withAuthor, withoutAuthor } from './author';
import { withCollaborators, withoutCollaborators } from './collaborators';
import { withoutStatus, withStatus } from './status';
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
  status: {
    in: (query) => withStatus(query),
    nin: (query) => withoutStatus(query),
  },
  region: {
    in: (query) => withRegion(query),
  },
};

export function filtersToScopes(filters) {
  const validFilters = pickBy(filters, (query, topicAndCondition) => {
    const [topic] = topicAndCondition.split('.');
    return topic in topicToQuery;
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition](query);
  });
}
