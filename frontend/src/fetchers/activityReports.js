import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  get, put, post, destroy,
} from './index';
import { REPORTS_PER_PAGE, ALERTS_PER_PAGE } from '../Constants';
import { combineReportDataFromApi } from './helpers';

const activityReportUrl = join('/', 'api', 'activity-reports');
const activityReportAlertUrl = join('/', 'api', 'activity-reports', 'alerts');
const activityReportsLocalStorageCleanupUrl = join('/', 'api', 'activity-reports', 'storage-cleanup');

export const legacyReportById = async (legacyId) => {
  const res = await get(join(activityReportUrl, 'legacy', legacyId));
  return res.json();
};

export const getApprovers = async (region) => {
  const res = await get(join(activityReportUrl, 'approvers', `?region=${region}`));
  return res.json();
};

export const submitReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'submit');
  const response = await put(url, data);
  return response.json();
};

export const saveReport = async (reportId, data) => {
  const report = await put(join(activityReportUrl, reportId.toString(DECIMAL_BASE)), data);
  return report.json();
};

export const deleteReport = async (reportId) => {
  await destroy(join(activityReportUrl, reportId.toString(DECIMAL_BASE)));
};

export const getGroupsForActivityReport = async (region) => {
  const res = await get(join(activityReportUrl, 'groups', `?region=${region}`));
  return res.json();
};

export const unlockReport = async (reportId) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'unlock');
  const response = await put(url);
  return response.status;
};

export const createReport = async (data) => {
  const report = await post(activityReportUrl, data);
  return report.json();
};

export const getReport = async (reportId) => {
  const report = await get(join(activityReportUrl, reportId.toString(DECIMAL_BASE)));
  return report.json();
};

export const getReports = async (sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = REPORTS_PER_PAGE, filters) => {
  const reports = await get(`${activityReportUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  const json = await reports.json();
  return combineReportDataFromApi(json);
};

export const getReportsViaIdPost = async (reportIds, sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = REPORTS_PER_PAGE) => {
  const reports = await post(`${activityReportUrl}/reportsByManyIds`, {
    reportIds,
    sortBy,
    sortDir,
    offset,
    limit,
  });
  const json = await reports.json();
  return combineReportDataFromApi(json);
};

export const getReportsForLocalStorageCleanup = async () => {
  const reports = await get(activityReportsLocalStorageCleanupUrl);
  return reports.json();
};

export const getReportAlerts = async (sortBy = 'startDate', sortDir = 'asc', offset = 0, limit = ALERTS_PER_PAGE, filters) => {
  const reports = await get(`${activityReportAlertUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  const json = await reports.json();
  const { alertsCount, alerts: rawAlerts, recipients } = json;

  const alerts = rawAlerts.map((alert) => ({
    ...alert,
    activityRecipients: recipients.filter(
      (recipient) => recipient.activityReportId === alert.id,
    ),
  }));

  return {
    alerts,
    alertsCount,
  };
};

export const getRecipients = async (region) => {
  const recipients = await get(join(activityReportUrl, 'activity-recipients', `?region=${region}`));
  return recipients.json();
};

export const getRecipientsForExistingAR = async (reportId) => {
  const url = join(activityReportUrl, `${reportId}`, 'activity-recipients');
  const recipients = await get(url);
  return recipients.json();
};

export const getGoals = async (grantIds) => {
  const params = grantIds.map((grantId) => `grantIds=${grantId}`);
  const url = join(activityReportUrl, 'goals', `?${params.join('&')}`);
  const goals = await get(url);
  return goals.json();
};

export const saveGoalsForReport = async (data) => {
  const url = join(activityReportUrl, 'goals');
  const goals = await post(url, data);
  return goals.json();
};

export const saveObjectivesForReport = async (data) => {
  const url = join(activityReportUrl, 'objectives');
  const objectives = await post(url, data);
  return objectives.json();
};

export const reviewReport = async (reportId, data) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'review');
  const report = await put(url, data);
  return report.json();
};

export const downloadReports = async (url) => {
  const download = await get(url);
  return download.blob();
};

export const resetToDraft = async (reportId) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'reset');
  const response = await put(url);
  return response.json();
};

export const setGoalAsActivelyEdited = async (reportId, goalIds, pageState) => {
  const params = goalIds.map((goalId) => `goalIds=${goalId}`);
  const url = join(
    activityReportUrl,
    reportId.toString(DECIMAL_BASE),
    'goals',
    'edit',
    `?${params.join('&')}`,
  );
  const response = await put(url, { pageState });
  return response.json();
};
