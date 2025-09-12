import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  get, put, post, destroy,
} from './index';

const collabReportUrl = '/api/collaboration-reports';
export const createReport = async (data) => {
  const report = await post(collabReportUrl, data);
  return report.json();
};

export const deleteReport = async (reportId) => {
  await destroy(join(collabReportUrl, reportId.toString(DECIMAL_BASE)));
};

export const getReport = async (reportId) => {
  const report = await get(join(collabReportUrl, reportId.toString(DECIMAL_BASE)));
  return report.json();
};

export const getReports = async () => {
  const reports = await get(collabReportUrl);
  const json = await reports.json();
  return json;
};

export const getAlerts = async () => {
  const url = join(collabReportUrl, 'alerts');

  const reports = await get(url);
  const json = await reports.json();
  return json;
};

export const reviewReport = async (reportId, data) => {
  const url = join(collabReportUrl, reportId.toString(DECIMAL_BASE), 'review');
  const report = await put(url, data);
  return report.json();
};

export const saveReport = async (reportId, data) => {
  const report = await put(join(collabReportUrl, reportId.toString(DECIMAL_BASE)), data);
  return report.json();
};

export const submitReport = async (reportId, data) => {
  const url = join(collabReportUrl, reportId.toString(DECIMAL_BASE), 'submit');
  const response = await put(url, data);
  return response.json();
};
