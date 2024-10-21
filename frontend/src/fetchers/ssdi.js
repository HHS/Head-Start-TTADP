import join from 'url-join';
import { get } from './index';
import { filtersToQueryString } from '../utils';
import { QA_DASHBOARD_FILTER_CONFIG } from '../pages/QADashboard/constants';

const ssdiUrl = join('/', 'api', 'ssdi');

const allowedTopicsForQuery = {
  'recipients-with-no-tta': [
    'region',
    'startDate',
    'endDate',
    'grantNumber',
    'stateCode',
  ],
  'recipients-with-ohs-standard-goal': [
    'region',
    'startDate',
    'endDate',
    'grantNumber',
    'stateCode',
  ],
  'qa-dashboard': [...QA_DASHBOARD_FILTER_CONFIG.map((filter) => filter.id), 'region'],
};

export const getSelfServiceDataQueryString = (filterName, filters) => {
  if (!allowedTopicsForQuery[filterName]) {
    throw new Error('Invalid filter name');
  }

  const config = allowedTopicsForQuery[filterName];

  const allowedFilters = filters.filter((filter) => config.includes(filter.topic));
  return filtersToQueryString(allowedFilters);
};

const getSelfServiceUrl = (filterName, filters) => {
  const queryString = getSelfServiceDataQueryString(filterName, filters);
  const baseUrl = join(ssdiUrl, filterName);
  return `${baseUrl}?${queryString}`;
};

export const getSelfServiceData = async (filterName, filters) => {
  const url = getSelfServiceUrl(filterName, filters);

  const response = await get(url);
  if (!response.ok) {
    throw new Error('Error fetching self service data');
  }
  return response.json();
};
