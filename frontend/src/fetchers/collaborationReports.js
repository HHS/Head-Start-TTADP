import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  get, put, post, destroy,
} from './index';

const collabReportUrl = '/api/collaboration-reports';

const getSortConfigParams = (sortConfig) => {
  const params = new URLSearchParams();
  params.append('sortDir', sortConfig.direction);
  params.append('sortBy', sortConfig.sortBy);
  params.append('activePage', sortConfig.activePage);
  params.append('limit', sortConfig.perPage || 10);
  params.append('offset', sortConfig.offset);
  return params;
};
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

export const getReports = async (sortConfig) => {
  const params = getSortConfigParams(sortConfig);
  const reports = await get(`${collabReportUrl}?${params.toString()}`);
  const json = await reports.json();
  return json;
};

export const getAlerts = async (sortConfig) => {
  const params = getSortConfigParams(sortConfig);
  const url = join(collabReportUrl, 'alerts');
  const reports = await get(`${url}?${params.toString()}`);
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
