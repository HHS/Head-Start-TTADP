import join from 'url-join';
import { REPORTS_PER_PAGE } from '../Constants';
import { get } from './index';

const sessionReportUrl = join('/', 'api', 'session-reports');

export const getSessionReports = async (
  sortBy = 'id',
  sortDir = 'desc',
  offset = 0,
  limit = REPORTS_PER_PAGE,
  filters,
) => {
  const reports = await get(
    `${sessionReportUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`,
  );
  return reports.json();
};

export const downloadSessionReports = async (url) => {
  const download = await get(url);
  return download.blob();
};
