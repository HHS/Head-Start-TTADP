/* eslint-disable import/prefer-default-export */
import widgets from '../../widgets';
import { filtersToScopes } from '../../scopes/activityReport';
import { setReadRegions } from '../../services/accessValidation';
import { DECIMAL_BASE } from '../../constants';

export async function getWidget(req, res) {
  const { widgetId } = req.params;
  const getWidgetData = widgets[widgetId];

  if (!getWidgetData) {
    res.sendStatus(404);
    return;
  }

  const query = await setReadRegions(req.query, req.session.userId, true);
  const region = ('region.in' in query && Array.isArray(query['region.in']) && query['region.in'][0]) ? parseInt(query['region.in'][0], DECIMAL_BASE) : 0;
  const scopes = filtersToScopes(query);
  const widgetData = await getWidgetData(scopes, region);

  res.json(widgetData);
}
