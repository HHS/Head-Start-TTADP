import join from 'url-join';

const activityReportUrl = join('/', 'api', 'activity-reports');

const callApi = async (url) => {
  const res = await fetch(url, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};

export const fetchApprovers = async () => {
  const res = await callApi(join(activityReportUrl, 'approvers'));
  return res.json();
};

export const submitReport = async (reportId, data, extraData) => {
  const url = join(activityReportUrl, reportId, 'submit');
  await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      report: data,
      metaData: extraData,
    }),
  });
};

export const saveReport = async (reportId, data) => {
  await fetch(join(activityReportUrl, reportId), {
    method: 'POST',
    credentials: 'same-origin',
    body: data,
  });
};

export const getReport = async (reportId) => {
  const report = await fetch(join(activityReportUrl, reportId));
  return report.json();
};
