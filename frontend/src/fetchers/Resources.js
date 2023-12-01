import join from 'url-join';
import { get } from './index';
import { TOPICS_PER_PAGE } from '../Constants';
import { combineReportDataFromApi } from './helpers';

export const fetchResourceData = async (query, reportSort) => {
  const urlQuery = `${query}${Object.keys(reportSort).map((key) => `&${key}=${reportSort[key]}`).join('')}`;

  const res = await get(join('/', 'api', 'resources', `?${urlQuery}`));
  const data = await res.json();

  return {
    ...data,
    activityReports: combineReportDataFromApi(data.activityReports),
  };
};

export const fetchTopicResources = async (sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = TOPICS_PER_PAGE, filters) => {
  const request = join('/', 'api', 'resources', 'topic-resources', `?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  const res = await get(request);
  return res.json();
};
