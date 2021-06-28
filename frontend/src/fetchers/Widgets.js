import join from 'url-join';
import { get } from './index';

const fetchWidget = async (widgetId, region, query = '') => {
  const queryStr = query ? `?${query}&` : '?&';
  const res = await get(join('/', 'api', 'widgets', `${widgetId}${queryStr}region.in[]=${region}`));
  return res.json();
};

export default fetchWidget;
