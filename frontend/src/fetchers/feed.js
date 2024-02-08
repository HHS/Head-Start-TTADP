import join from 'url-join';
import { get } from './index';

const feedUrl = join('/', 'api', 'feeds');

const getNotifications = async () => {
  const url = join(feedUrl, 'whats-new');
  const response = await get(url);
  return response.text();
};

const getSingleFeedItemByTag = async (tag) => {
  const url = join(feedUrl, 'item', `?tag=${tag}`);
  const response = await get(url);
  return response.text();
};

const getClassGuidanceFeed = async () => {
  const url = join(feedUrl, 'class-guidance');
  const response = await get(url);
  return response.text();
};

export {
  getNotifications,
  getSingleFeedItemByTag,
  getClassGuidanceFeed,
};
