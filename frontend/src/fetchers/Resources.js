import join from 'url-join';
import { get } from './index';
import { TOPICS_PER_PAGE } from '../Constants';

export const fetchResourceData = async (query) => {
  const res = await get(join('/', 'api', 'resources', `?${query}`));
  return res.json();
};

export const fetchTopicResources = async (sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = TOPICS_PER_PAGE, filters) => {
  const request = join('/', 'api', 'resources', 'topic-resources', `?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  const res = await get(request);
  return res.json();
};
