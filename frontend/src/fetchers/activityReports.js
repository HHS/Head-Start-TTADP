import join from 'url-join';
import {
  get, put, post, destroy,
} from './index';
import { DECIMAL_BASE, REPORTS_PER_PAGE, ALERTS_PER_PAGE } from '../Constants';

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

function combineTopics(report, expandedTopics) {
  const reportTopics = expandedTopics.filter((topic) => report.id === topic.activityReportId)
    .map((t) => t.name);

  const exclusiveTopics = new Set([...report.sortedTopics, ...reportTopics]);
  const topicsArr = [...exclusiveTopics];
  topicsArr.sort();

  return topicsArr;
}

export const getReports = async (sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = REPORTS_PER_PAGE, filters) => {
  const reports = await get(`${activityReportUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  const json = await reports.json();
  const {
    count, rows: rawRows, recipients, topics,
  } = json;

  const expandedTopics = topics.reduce((acc, topic) => {
    const { name, objectives } = topic;
    const aros = objectives.map((objective) => objective.activityReportObjectives).flat();

    return [
      ...acc,
      ...aros.map((aro) => ({
        activityReportId: aro.activityReportId,
        name,
      })),
    ];
  }, []);

  const rows = rawRows.map((row) => ({
    ...row,
    activityRecipients: recipients.filter(
      (recipient) => recipient.activityReportId === row.id,
    ),
    sortedTopics: combineTopics(row, expandedTopics),
  }));

  return {
    rows,
    count,
  };
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

export const downloadReports = async (url) => {
  const download = await get(url);
  return download.blob();
};

export const resetToDraft = async (reportId) => {
  const url = join(activityReportUrl, reportId.toString(DECIMAL_BASE), 'reset');
  const response = await put(url);
  return response.json();
};
