import join from 'url-join';
import {
  get, put, post, destroy,
} from './index';
import { filtersToQueryString } from '../utils';

const communicationLogUrl = join(
  '/',
  'api',
  'communication-logs',
);

export const getAdditionalCommunicationLogData = async (regionId) => {
  const response = await get(
    join(
      communicationLogUrl,
      'region',
      String(regionId),
      'additional-data',
    ),
  );

  return response.json();
};

export const getCommunicationLogById = async (regionId, logId) => {
  const response = await get(
    join(
      communicationLogUrl,
      'region',
      String(regionId),
      'log',
      String(logId),
    ),
  );

  return response.json();
};

export const getCommunicationLogsByRecipientId = async (
  regionId, recipientId, sortBy, direction, offset, limit = 10, filters = [], format = 'json',
) => {
  const query = filtersToQueryString(filters);

  const limitQuery = limit ? `&limit=${limit}` : '';
  const queryString = `?sortBy=${sortBy}&direction=${direction}&offset=${offset}${limitQuery}&format=${format}&${query}`;

  const response = await get(
    `${join(
      communicationLogUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
    )}${queryString}`,
  );

  if (format === 'csv') {
    return response.blob();
  }

  return response.json();
};

export const getCommunicationLogs = async (
  sortBy, direction, offset, limit = 10, filters = [], format = 'json',
) => {
  const query = filtersToQueryString(filters);

  const limitQuery = limit ? `&limit=${limit}` : '';
  const queryString = `?sortBy=${sortBy}&direction=${direction}&offset=${offset}${limitQuery}&format=${format}&${query}`;

  const response = await get(
    `${join(
      communicationLogUrl,
      'region',
    )}${queryString}`,
  );

  if (format === 'csv') {
    return response.blob();
  }

  return response.json();
};

export const updateCommunicationLogById = async (logId, data) => {
  const response = await put(
    join(
      communicationLogUrl,
      'log',
      String(logId),
    ),
    { data },
  );

  return response.json();
};

export const deleteCommunicationLogById = async (logId) => destroy(
  join(
    communicationLogUrl,
    'log',
    String(logId),
  ),
);

export const createRegionalCommunicationLog = async (regionId, data) => {
  const response = await post(
    join(
      communicationLogUrl,
      'region',
      String(regionId),
    ),
    { data },
  );

  return response.json();
};

export const createCommunicationLogByRecipientId = async (regionId, recipientId, data) => {
  const response = await post(
    join(
      communicationLogUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
    ),
    { data },
  );

  return response.json();
};
