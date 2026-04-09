/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import getCachedResponse from '../../lib/cache';
import { goalDashboard } from '../../services/dashboards/goal';
import handleErrors from '../../lib/apiErrorHandler';
import { currentUserId } from '../../services/currentUser';

const namespace = 'SERVICE:GOALS';

const logContext = {
  namespace,
};

const GOAL_DASHBOARD_CACHE_VERSION = 3;

export async function getGoalDashboardData(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const query = await setReadRegions(req.query, userId);
    const key = `getGoalDashboardData?v=${GOAL_DASHBOARD_CACHE_VERSION}&${JSON.stringify(query)}`;

    const response = await getCachedResponse(
      key,
      async () => {
        const scopes = await filtersToScopes(query, { userId });
        const data = await goalDashboard(scopes);
        return JSON.stringify(data);
      },
      JSON.parse,
    );

    res.json(response);
  } catch (error) {
    await handleErrors(req, res, error, `${logContext}:GET_GOAL_DASHBOARD_DATA`);
  }
}
