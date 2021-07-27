import join from 'url-join';
import { get } from './index';

const fetchWidget = async (widgetId, region, dateRange = '') => {
  const regionStr = region ? `&region.in[]=${region}` : '';
  const dateRangeStr = dateRange !== '' ? `&startDate.win=${dateRange}` : '';
  const res = await get(join('/', 'api', 'widgets', widgetId, '?', regionStr, dateRangeStr));
  return res.json();
};

export default fetchWidget;
