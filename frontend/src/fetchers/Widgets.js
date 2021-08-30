import join from 'url-join';
import { get } from './index';

const fetchWidget = async (widgetId, region, dateRange = '', roles = '') => {
  const regionStr = region ? `&region.in[]=${region}` : '';
  const rolesStr = roles ? `&role.in[]=${roles}` : '';
  const dateRangeStr = dateRange !== '' ? `&startDate.win=${dateRange}` : '';
  const res = await get(join('/', 'api', 'widgets', widgetId, '?', regionStr, dateRangeStr, rolesStr));
  return res.json();
};

export default fetchWidget;
