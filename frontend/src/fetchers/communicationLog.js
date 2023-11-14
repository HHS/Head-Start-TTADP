import join from 'url-join';
import {
  get, put, post, destroy,
} from './index';

const communicationLogUrl = join(
  '/',
  'api',
  'communication-logs',
);

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
  regionId, recipientId, sortBy, direction, offset,
) => {
  const response = await get(
    `${join(
      communicationLogUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
    )}?sortBy=${sortBy}&direction=${direction}&offset=${offset}`,
  );

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

export const deleteCommunicationLogById = async (logId) => {
  const response = await destroy(
    join(
      communicationLogUrl,
      'log',
      String(logId),
    ),
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
