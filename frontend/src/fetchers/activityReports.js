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

export const submitReport = async (data, extraData) => {
  const url = join(activityReportUrl, 'submit');
  await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    body: JSON.stringify({
      report: data,
      metaData: extraData,
    }),
  });
};
