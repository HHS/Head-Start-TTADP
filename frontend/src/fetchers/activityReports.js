import join from 'url-join';
import { get, put, post } from './index';

const activityReportUrl = join('/', 'api', 'activity-reports');

export const fetchApprovers = async () => {
  const res = await get(join(activityReportUrl, 'approvers'));
  return res.json();
};

export const submitReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId, 'submit');
  await post(url, {
    report: data,
  });
};

export const saveReport = async (reportId, data) => {
  const report = await put(join(activityReportUrl, reportId.toString(10)), data);
  return report.json();
};

export const createReport = async (data) => {
  const report = await post(activityReportUrl, data);
  return report.json();
};

export const getReport = async (reportId) => {
  const report = await get(join(activityReportUrl, reportId.toString(10)));
  return report.json();
};

export const getRecipients = async () => {
  const recipients = await get(join(activityReportUrl, 'activity-recipients'));
  return recipients.json();
};
