/* eslint-disable import/prefer-default-export */
import widgets from '../../widgets';
import { filtersToScopes } from '../../scopes/activityReport';
import handleErrors from '../../lib/apiErrorHandler';
import { setReadRegions } from '../../services/accessValidation';
import { onlyAllowedKeys, formatQuery } from './utils';

const namespace = 'SERVICE:WIDGETS';

const logContext = {
  namespace,
};

export async function getWidget(req, res) {
  try {
    const { widgetId } = req.params;
    const getWidgetData = widgets[widgetId];

    if (!getWidgetData) {
      res.sendStatus(404);
      return;
    }

    // This returns the query object with "region" property filtered by user permissions
    const query = await setReadRegions(req.query, req.session.userId, true);

    // convert the query to scopes
    const scopes = filtersToScopes(query);

    // filter out any disallowed keys
    const queryWithFilteredKeys = onlyAllowedKeys(query);

    /**
   * Proposal: This is where we should do things like format values in the query object
   * if we need special formatting, a la parsing the region for use in string literals   *
   */

    const formattedQueryWithFilteredKeys = formatQuery(queryWithFilteredKeys);

    // pass in the scopes and the query
    const widgetData = await getWidgetData(scopes, formattedQueryWithFilteredKeys);

    res.json(widgetData);
  } catch (error) {
    handleErrors(req, res, error, logContext);
  }
}
