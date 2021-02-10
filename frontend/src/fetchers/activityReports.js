import join from 'url-join';
import { get, put, post } from './index';
import { DECIMAL_BASE } from '../Constants';

const activityReportUrl = join('/', 'api', 'activity-reports');

export const getApprovers = async (region) => {
  const res = await get(join(activityReportUrl, 'approvers', `?region=${region}`));
  return res.json();
};

export const submitReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'submit');
  const report = await post(url, data);
  return report.json();
};

export const saveReport = async (reportId, data) => {
  const report = await put(join(activityReportUrl, reportId.toString(DECIMAL_BASE)), data);
  return report.json();
};

export const createReport = async (data) => {
  const report = await post(activityReportUrl, data);
  return report.json();
};

export const getReport = async (reportId) => {
  const report = await get(join(activityReportUrl, reportId.toString(DECIMAL_BASE)));
  return report.json();
};

export const getRecipients = async () => {
  const recipients = await get(join(activityReportUrl, 'activity-recipients'));
  return recipients.json();
};

export const getGoals = async (grantIds) => {
  const params = grantIds.map((grantId) => `grantIds=${grantId}`);
  const url = join(activityReportUrl, 'goals', `?${params.join('&')}`);
  const goals = await get(url);
  return goals.json();
};

export const getCollaborators = async (region) => {
  const url = join('/', 'api', 'users', 'collaborators', `?region=${region}`);
  const collaborators = await get(url);
  return collaborators.json();
};

export const reviewReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'review');
  const report = await put(url, data);
  return report.json();
};
