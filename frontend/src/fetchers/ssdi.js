import join from 'url-join';
import { get } from './index';
import { filtersToQueryString } from '../utils';
import { QA_DASHBOARD_FILTER_CONFIG } from '../pages/QADashboard/constants';

const ssdiUrl = join('/', 'api', 'ssdi');

const urlsForQuery = {
  'recipients-with-no-tta': join(ssdiUrl, 'api', 'dashboards', 'qa', 'no-tta.sql'),
  'recipients-with-ohs-standard-fei-goal': join(ssdiUrl, 'api', 'dashboards', 'qa', 'fei.sql'),
  'recipients-with-class-scores-and-goals': join(ssdiUrl, 'api', 'dashboards', 'qa', 'class.sql'),
  'qa-dashboard': join(ssdiUrl, 'api', 'dashboards', 'qa', 'dashboard.sql'),
};

const allowedTopicsForQuery = {
  'recipients-with-no-tta': [
    'recipient',
    'grantNumber',
    'programType',
    'stateCode',
    'region',
    'startDate',
    'endDate',
  ],
  'recipients-with-ohs-standard-fei-goal': [
    'recipient',
    'grantNumber',
    'programType',
    'stateCode',
    'region',
    'group',
    'createDate',
    'activityReportGoalResponse',
  ],
  'recipients-with-class-scores-and-goals': [
    'recipient',
    'grantNumber',
    'programType',
    'stateCode',
    'region',
    'domainEmotionalSupport',
    'domainClassroomOrganization',
    'domainInstructionalSupport',
    'createDate',
  ],
  'qa-dashboard': [...QA_DASHBOARD_FILTER_CONFIG.map((filter) => filter.id),
    'region',
    'reportId',
    'activityReportGoalResponse',
    'role',
  ],
};

export const containsFiltersThatAreNotApplicable = (filterName, filters) => {
  if (!allowedTopicsForQuery[filterName]) {
    throw new Error('Invalid filter name');
  }

  const config = allowedTopicsForQuery[filterName];

  return filters.some((filter) => !config.includes(filter.topic));
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
  const baseUrl = join(urlsForQuery[filterName]);
  return `${baseUrl}?${queryString}`;
};

export const getSelfServiceData = async (filterName, filters, dataSetSelection = []) => {
  const url = getSelfServiceUrl(filterName, filters);

  const urlToUse = url + dataSetSelection.map((s) => `&dataSetSelection[]=${s}`).join('');
  const response = await get(urlToUse);
  if (!response.ok) {
    throw new Error('Error fetching self service data');
  }
  return response.json();
};
