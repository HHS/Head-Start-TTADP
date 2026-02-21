import join from 'url-join';
import { uniqueId } from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import {
  get, post, put, destroy,
} from './index';
import { uploadFile } from './File';
import { blobToCsvDownload, filtersToQueryString } from '../utils';
import { formatDateValue, now } from '../lib/dates';

const sessionsUrl = join('/', 'api', 'session-reports');

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

export const getSessionReportsTable = async (sortConfig, filters = []) => {
  const params = getSortConfigParams(sortConfig);
  const filterParams = filtersToQueryString(filters);
  const url = filterParams
    ? `${sessionsUrl}?${params.toString()}&${filterParams}`
    : `${sessionsUrl}?${params.toString()}`;
  const response = await get(url);
  return response.json();
};

const getSessionReportCSV = async (url) => {
  const response = await get(url);
  const csv = await response.text();
  blobToCsvDownload(new Blob([csv], { type: 'text/csv' }), `${formatDateValue(now(), 'YYYY-MM-DD')}-${uniqueId('training-reports-export-')}.csv`);
};

export const getSessionReportsCSV = async (sortConfig, filters = []) => {
  const params = formatCSVParams(getSortConfigParams(sortConfig));
  params.append('format', 'csv');
  const filterParams = filtersToQueryString(filters);
  const url = filterParams
    ? `${sessionsUrl}?${params.toString()}&${filterParams}`
    : `${sessionsUrl}?${params.toString()}`;
  return getSessionReportCSV(url);
};

export const getSessionReportsCSVById = async (ids, sortConfig, filters = []) => {
  const params = formatCSVParams(getSortConfigParams(sortConfig));
  params.append('format', 'csv');
  const reportIds = ids.map((id) => (`sessionId.in[]=${id}`)).join('&');
  const filterParams = filtersToQueryString(filters);
  const url = filterParams
    ? `${sessionsUrl}?${reportIds}&${params.toString()}&${filterParams}`
    : `${sessionsUrl}?${reportIds}&${params.toString()}`;
  return getSessionReportCSV(url);
};

export const createSession = async (eventId, data = {}) => {
  const response = await post(sessionsUrl, {
    eventId,
    data: {
      reviewStatus: REPORT_STATUSES.DRAFT,
      status: 'In progress',
      ...data,
    },
  });
  return response.json();
};

export const getSessionBySessionId = async (sessionId) => {
  const response = await get(join(sessionsUrl, 'id', sessionId));
  return response.json();
};

export const getSessionsByEventId = async (eventId) => {
  const response = await get(join(sessionsUrl, 'eventId', eventId));
  return response.json();
};

export const updateSession = async (sessionId, data) => {
  const response = await put(join(sessionsUrl, 'id', sessionId), data);
  return response.json();
};

export const deleteSession = async (sessionId) => {
  const response = await destroy(join(sessionsUrl, 'id', sessionId));
  return response.json();
};

export const uploadSessionObjectiveFiles = async (sessionId, files) => {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  files.forEach((file) => formData.append('file', file));
  return uploadFile(formData);
};

export const deleteSessionObjectiveFile = async (sessionId, fileId) => {
  const fileUrl = join('/', 'api', 'files');
  const response = await destroy(
    join(fileUrl, 's', sessionId, fileId),
  );
  return response.status;
};

export const getPossibleSessionParticipants = async (regionId, stateCodes = []) => {
  const url = join(sessionsUrl, 'participants', String(regionId));
  const params = new URLSearchParams();
  stateCodes.forEach((code) => params.append('states', code));
  const response = await get(`${url}?${params.toString()}`);
  return response.json();
};

export const getGroupsForSession = async (regionId) => {
  const response = await get(join(sessionsUrl, 'groups', `?region=${regionId}`));
  return response.json();
};
