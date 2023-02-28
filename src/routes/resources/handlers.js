/* eslint-disable import/prefer-default-export */
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import { setReadRegions } from '../../services/accessValidation';
import { resourceDashboardPhase1 } from '../../services/dashboards/resource';

export async function getResourcesDashboardData(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const scopes = await filtersToScopes(query);
  // Garrett call your service function here.
  // Build scopes from the req (see AR handler)
  const data = await resourceDashboardPhase1(scopes);
  const formatedData = {
    resourcesDashboardOverview: data.overview,
    resourcesUse: data.use,
  };
  res.json(formatedData);
}
