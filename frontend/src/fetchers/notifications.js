/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const feedUrl = join('/', 'api', 'feeds');

const getNotifications = async () => {
  const url = join(feedUrl, 'whats-new');
  return get(url);
};

export {
  getNotifications,
};
