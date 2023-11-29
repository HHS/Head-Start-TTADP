/* eslint-disable import/prefer-default-export */
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import { setReadRegions } from '../../services/accessValidation';
import { resourceDashboardPhase1 } from '../../services/dashboards/resource';
import getCachedResponse from '../../lib/cache';
import { activityReports } from '../../services/activityReports';

export async function getResourcesDashboardData(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const key = `getResourcesDashboardData?${JSON.stringify(query)}`;

  const response = await getCachedResponse(
    key,
    async () => {
      const scopes = await filtersToScopes(query);
      const data = await resourceDashboardPhase1(scopes);
      return JSON.stringify({
        resourcesDashboardOverview: data.overview,
        resourcesUse: data.use,
        topicUse: data.topicUse,
        activityReports: data.activityReports,
      });
    },
    JSON.parse,
  );

  const reports = await activityReports(
    {},
    true,
    userId,
    response.activityReports,
  );

  res.json({
    ...response,
    activityReports: reports,
  });
}
