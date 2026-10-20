/* eslint-disable import/prefer-default-export */

import { once } from 'node:events';
import { Stringifier } from 'csv-stringify';
import handleErrors from '../../lib/apiErrorHandler';
import getCachedResponse from '../../lib/cache';
import { auditLogger as logger } from '../../logger';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  GOAL_DASHBOARD_CSV_COLUMNS,
  goalDashboardGoals,
  goalDashboardGoalsCsvRows,
} from '../../services/dashboards/goal';
import widgets from '../../widgets';
import { formatQuery, onlyAllowedKeys } from './utils';

const namespace = 'SERVICE:WIDGETS';
const WIDGET_CACHE_VERSION = 2;

const logContext = {
  namespace,
};

export function keysDisallowCache(query) {
  const DISALLOWED_KEYS = ['myReports'];
  let disallowCache = false;

  Object.keys(query).forEach((key) => {
    const firstFilterParam = key.split('.')[0];
    if (DISALLOWED_KEYS.includes(firstFilterParam)) {
      disallowCache = true;
    }
  });
  return disallowCache;
}

async function getWidgetContext(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const scopes = await filtersToScopes(query, {
    grant: { subset: true },
    userId,
  });
  const queryWithFilteredKeys = onlyAllowedKeys(query);
  const formattedQueryWithFilteredKeys = formatQuery(queryWithFilteredKeys);

  return {
    scopes,
    queryWithFilteredKeys,
    formattedQueryWithFilteredKeys,
  };
}

async function streamGoalDashboardGoalsCsv(res, scopes, query) {
  const csvRows = goalDashboardGoalsCsvRows(scopes, query);
  const firstRow = await csvRows.next();
  let responseStarted = false;
  const stringifier = new Stringifier({
    header: false,
    quoted: true,
    quoted_empty: true,
    columns: GOAL_DASHBOARD_CSV_COLUMNS,
  });
  const headerLine = `${GOAL_DASHBOARD_CSV_COLUMNS.map(({ header }) => `"${header.replace(/"/g, '""')}"`).join(',')}\n`;

  try {
    res.type('text/csv');
    res.attachment('goal-dashboard-goals.csv');
    responseStarted = true;

    if (!res.write('\ufeff')) {
      await once(res, 'drain');
    }

    if (!res.write(headerLine)) {
      await once(res, 'drain');
    }

    if (firstRow.done) {
      res.end();
      return;
    }

    stringifier.pipe(res);
    stringifier.write(firstRow.value);

    for await (const row of csvRows) {
      stringifier.write(row);
    }

    stringifier.end();
  } catch (error) {
    if (!responseStarted) {
      throw error;
    }

    logger.error(`${namespace} - goalDashboardGoals CSV stream failed after response started`, {
      err: error,
    });
    stringifier.destroy(error);
    res.destroy(error);
  }
}

export async function getWidget(req, res) {
  try {
    const { widgetId } = req.params;
    const getWidgetData = widgets[widgetId];

    if (!getWidgetData) {
      res.sendStatus(404);
      return;
    }

    const { scopes, queryWithFilteredKeys, formattedQueryWithFilteredKeys } =
      await getWidgetContext(req, res);

    if (widgetId === 'goalDashboardGoals' && String(req.query.format).toLowerCase() === 'csv') {
      await streamGoalDashboardGoalsCsv(res, scopes, formattedQueryWithFilteredKeys);
      return;
    }

    const skipCache = keysDisallowCache(queryWithFilteredKeys) || req.query.skipCache === 'true';
    const key = `${widgetId}?v=${WIDGET_CACHE_VERSION}&${JSON.stringify(formattedQueryWithFilteredKeys)}`;

    if (skipCache) {
      const widgetData = await getWidgetData(scopes, formattedQueryWithFilteredKeys);
      res.json(widgetData);
      return;
    }
    const widgetData = await getCachedResponse(
      key,
      async () => {
        const data = await getWidgetData(scopes, formattedQueryWithFilteredKeys);
        return JSON.stringify(data);
      },
      JSON.parse
    );

    res.json(widgetData);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function postWidget(req, res) {
  try {
    const { widgetId } = req.params;

    if (widgetId !== 'goalDashboardGoals') {
      res.sendStatus(404);
      return;
    }

    const { scopes, formattedQueryWithFilteredKeys } = await getWidgetContext(req, res);
    const requestQuery = {
      ...formattedQueryWithFilteredKeys,
      goalIds: req.body?.goalIds,
    };

    if (String(req.query.format).toLowerCase() === 'csv') {
      await streamGoalDashboardGoalsCsv(res, scopes, requestQuery);
      return;
    }

    res.json(await goalDashboardGoals(scopes, requestQuery));
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
