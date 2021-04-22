import join from 'url-join';

const getReportsDownloadURL = (reportIds) => {
  const activityReportUrl = join('/', 'api', 'activity-reports');
  const reportsQuery = reportIds.map((i) => `report[]=${i}`);
  const queryItems = ['?format=csv', ...reportsQuery];
  return join(activityReportUrl, 'download', queryItems.join('&'));
};

export {
  getReportsDownloadURL as default,
  getReportsDownloadURL,
};
