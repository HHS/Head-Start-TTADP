import join from 'url-join';

function combineTopics(report, expandedTopics) {
  const reportTopics = expandedTopics.filter((topic) => report.id === topic.activityReportId)
    .map((t) => t.name);

  const exclusiveTopics = new Set([
    ...report.sortedTopics,
    ...reportTopics,
  ]);
  const topicsArr = [...exclusiveTopics];
  topicsArr.sort();

  return topicsArr;
}

const combineReportDataFromApi = (reportData) => {
  const {
    count, rows: rawRows, recipients, topics,
  } = reportData;

  const rows = rawRows.map((row) => ({
    ...row,
    activityRecipients: recipients.filter(
      (recipient) => recipient.activityReportId === row.id,
    ),
    sortedTopics: combineTopics(row, topics),
  }));

  return {
    rows,
    count,
  };
};

const getReportsDownloadURL = (reportIds) => {
  const activityReportUrl = join('/', 'api', 'activity-reports');
  const reportsQuery = reportIds.map((i) => `report[]=${i}`);
  const queryItems = ['?format=csv', ...reportsQuery];
  return join(activityReportUrl, 'download', queryItems.join('&'));
};

const getAllReportsDownloadURL = (filterQuery) => {
  const query = filterQuery ? `?${filterQuery}` : '';
  return join('/', 'api', 'activity-reports', `download-all${query}`);
};

const getAllAlertsDownloadURL = (filterQuery) => {
  const query = filterQuery ? `?${filterQuery}` : '';
  return join('/', 'api', 'activity-reports', 'alerts', `download-all${query}`);
};

const getSessionReportsDownloadURL = (reportIds) => {
  const sessionReportUrl = join('/', 'api', 'session-reports');
  const reportsQuery = reportIds.map((i) => `report[]=${i}`);
  const queryItems = ['?format=csv', ...reportsQuery];
  return join(sessionReportUrl, 'download', queryItems.join('&'));
};

const getAllSessionReportsDownloadURL = (filterQuery) => {
  const query = filterQuery ? `?${filterQuery}` : '';
  return join('/', 'api', 'session-reports', `download-all${query}`);
};

export {
  getReportsDownloadURL as default,
  getReportsDownloadURL,
  getAllReportsDownloadURL,
  getAllAlertsDownloadURL,
  getSessionReportsDownloadURL,
  getAllSessionReportsDownloadURL,
  combineReportDataFromApi,
};
