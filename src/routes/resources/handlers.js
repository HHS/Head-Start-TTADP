/* eslint-disable import/prefer-default-export */

import getCachedResponse from '../../lib/cache';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import { resourceDashboardFlat, resourceDashboardPhase1 } from '../../services/dashboards/resource';

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
    JSON.parse
  );

  res.json(response);
}

export async function getFlatResourcesDataWithCache(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const key = `getFlatResourcesDashboardData?v=${RESOURCE_DATA_CACHE_VERSION}&${JSON.stringify(query)}`;

  const response = await getCachedResponse(
    key,
    async () => {
      const scopes = await filtersToScopes(query);
      const data = await resourceDashboardFlat(scopes);
      return JSON.stringify(data);
    },
    JSON.parse
  );

  res.json(response);
}
