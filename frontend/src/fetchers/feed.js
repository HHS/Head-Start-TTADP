import join from 'url-join';
import { get } from './index';

const feedUrl = join('/', 'api', 'feeds');

const getWhatsNew = async () => {
  const url = join(feedUrl, 'whats-new');
  const response = await get(url);
  return response.text();
};

const getSingleFeedItemByTag = async (tag, signal = null) => {
  const url = join(feedUrl, 'item', `?tag=${tag}`);
  const response = await get(url, signal);
  return response.text();
};

export { getSingleFeedItemByTag, getWhatsNew };
