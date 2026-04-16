import join from 'url-join';
import { get } from './index';

const fetchWidget = async (widgetId, query, signal = null) => {
  const res = await get(join('/', 'api', 'widgets', `${widgetId}?${query}`), signal);
  return res.json();
};

export default fetchWidget;
