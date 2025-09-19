import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import moment from 'moment';
import { uniqueId } from 'lodash';
import {
  get, put, post, destroy,
} from './index';
import { blobToCsvDownload } from '../utils';

const collabReportUrl = '/api/collaboration-reports';

const SORT_PARAMS_CONFIG = {
  sortDir: 'direction',
  sortBy: 'sortBy',
  activePage: 'activePage',
  offset: 'offset',
  limit: 'perPage',
};

const getSortConfigParams = (sortConfig) => {
  const params = new URLSearchParams();
  Object.entries(SORT_PARAMS_CONFIG).forEach(([paramName, configLocation]) => {
    if (sortConfig[configLocation]) {
      params.append(paramName, sortConfig[configLocation]);
    }
  });
  return params;
};

const formatCSVParams = (params) => {
  params.delete('limit');
  params.delete('activePage');
  params.delete('offset');
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

export const getCSV = async (url) => {
  const reports = await get(url);
  const csv = await reports.text();
  blobToCsvDownload(new Blob([csv], { type: 'text/csv' }), `${moment().format('YYYY-MM-DD')}-${uniqueId('collab-reports-export-')}.csv`);
};

export const getReportsCSVById = async (ids, sortConfig) => {
  const params = formatCSVParams(getSortConfigParams(sortConfig));
  const reportIds = ids.map((id) => (`id.in[]=${id}`)).join('&');
  const url = join(collabReportUrl, 'csv');
  return getCSV(`${url}?${reportIds}&${params.toString()}`);
};

export const getReportsCSV = async (sortConfig) => {
  const params = formatCSVParams(getSortConfigParams(sortConfig));
  const url = join(collabReportUrl, 'csv');
  return getCSV(`${url}?${params.toString()}`);
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
