import { createFiltersToScopes } from '../utils';

const topicToQuery = {
  startDate: {
    bef: (query) => beforeStartDate(query),
    aft: (query) => afterStartDate(query),
    win: (query) => withinStartDates(query),
    in: (query) => withinStartDates(query),
  },
  region: {
    in: (query) => withRegion(query),
    nin: (query) => withoutRegion(query),
  },
  collaborators: {
    ctn: (query) => withCollaborators(query),
    nctn: (query) => withoutCollaborators(query),
  },
};

const reportsFiltersToScopes = (
  filters,
  options,
  userId,
) => createFiltersToScopes(
  filters,
  topicToQuery,
  options,
  userId,
);

export {
  reportsFiltersToScopes,
};
