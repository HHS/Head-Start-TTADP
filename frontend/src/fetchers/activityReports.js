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

export const getRecipients = async () => {
  const recipients = await get(join(activityReportUrl, 'activity-recipients'));
  return recipients.json();
};
