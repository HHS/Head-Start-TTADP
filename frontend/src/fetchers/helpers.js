import join from 'url-join';

const getReportsDownloadURL = (reportIds) => {
  const activityReportUrl = join('/', 'api', 'activity-reports');
  const reportsQuery = reportIds.map((i) => `report[]=${i}`);
  const queryItems = ['?format=csv', ...reportsQuery];
  return join(activityReportUrl, 'download', queryItems.join('&'));
};

const getAllReportsDownloadURL = (filterQuery) => {
  const query = filterQuery ? `?${filterQuery}` : '';
  return join('/', 'api', 'activity-reports', `downloadAll${query}`);
};

export {
  getReportsDownloadURL as default,
  getReportsDownloadURL,
  getAllReportsDownloadURL,
};
