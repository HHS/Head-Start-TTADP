import join from 'url-join';
import { get, put, post } from './index';

const activityReportUrl = join('/', 'api', 'activity-reports');

export const getApprovers = async (region) => {
  const res = await get(join(activityReportUrl, 'approvers', `?region=${region}`));
  return res.json();
};

export const submitReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId.toString(10), 'submit');
  const report = await post(url, data);
  return report.json();
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

export const getCollaborators = async (region) => {
  const url = join('/', 'api', 'users', 'collaborators', `?region=${region}`);
  const collaborators = await get(url);
  return collaborators.json();
};
