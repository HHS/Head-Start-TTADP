import join from 'url-join';
import { get } from './index';
import { WIDGET_TYPES } from '../Constants';

const fetchWidget = async (widgetId, region, dateRange = '', roles = '', widgetType = WIDGET_TYPES.ACTIVITY_REPORT) => {
  const regionStr = region ? `&region.in[]=${region}` : '';
  const rolesStr = roles ? `&role.in[]=${roles}` : '';
  const dateRangeStr = dateRange !== '' ? `&startDate.win=${dateRange}` : '';
  const widgetTypeStr = `&widgetType=${widgetType}`;
  const res = await get(join('/', 'api', 'widgets', widgetId, '?', regionStr, dateRangeStr, rolesStr, widgetTypeStr));
  return res.json();
};

export default fetchWidget;
