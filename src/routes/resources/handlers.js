/* eslint-disable import/prefer-default-export */
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import { setReadRegions } from '../../services/accessValidation';
import { resourceDashboardPhase1 } from '../../services/dashboards/resource';
import getCachedResponse from '../../lib/cache';
import { activityReports } from '../../services/activityReports';

const RESOURCE_DATA_CACHE_VERSION = 1.5;

export async function getResourcesDashboardData(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const key = `getResourcesDashboardData?v=${RESOURCE_DATA_CACHE_VERSION}&${JSON.stringify(query)}`;

  const response = await getCachedResponse(
    key,
    async () => {
      const scopes = await filtersToScopes(query);
      const data = await resourceDashboardPhase1(scopes);
      return JSON.stringify({
        resourcesDashboardOverview: data.overview,
        resourcesUse: data.use,
        topicUse: data.topicUse,
        reportIds: data.reportIds,
      });
    },
    JSON.parse,
  );

  const {
    sortBy,
    direction: sortDir,
    limit,
    offset,
  } = req.query;

  const reportSortConfig = {
    sortBy,
    sortDir,
    offset,
    limit,
  };

  // const reports = await activityReports(
  //   reportSortConfig,
  //   true,
  //   userId,
  //   response.reportIds,
  // );

  res.json({
    ...response,
    activityReports: {
      rows: [],
      count: 0,
      topics: [],
      recipients: [],
    },
  });
}
