import join from 'url-join';
import { get } from './index';

const fetchWidget = async (widgetId, query) => {
  const res = await get(join('/', 'api', 'widgets', `${widgetId}?${query}`));
  return res.json();
};

export default fetchWidget;
