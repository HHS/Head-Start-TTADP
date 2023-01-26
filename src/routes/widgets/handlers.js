/* eslint-disable import/prefer-default-export */
import widgets from '../../widgets';
import handleErrors from '../../lib/apiErrorHandler';
import { setReadRegions } from '../../services/accessValidation';
import { onlyAllowedKeys, formatQuery } from './utils';
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';

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
    const userId = await currentUserId(req, res);
    const query = await setReadRegions(req.query, userId);

    // Determine what scopes we need.
    /**
     * right now we are hard-coding in the parameter "subset", for which I am using to indicate
     * that the scopes returned should be to produce a total subset based on which model is
     * specified. that feels like a bit of word salad, so hopefully that makes sense.
     *
     * In this case, we are currently only querying for activity reports in the widgets
     * as the main model but in the overview widgets we also need a matching subset of grants
     * so this specifies that the grant query should be returned as a subset based on the activity
     * report filters. I'm not sure about the naming here.
     *
     * The idea is twofold, firstly, that we can expand the options passed to filtersToScopes and
     * also that we can as needed modify the request to add certain objects
     */
    const scopes = await filtersToScopes(
      query,
      {
        grant: { subset: true },
        userId,
      },
    );
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
