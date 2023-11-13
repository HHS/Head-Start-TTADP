import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  get, put, post, destroy,
} from './index';

const communicationLogUrl = join(
  'api',
  'communication-logs',
);

export const getCommunicationLogById = async (regionId, logId) => {
  const response = await get(
    join(
      communicationLogUrl,
      'region',
      regionId.toString(DECIMAL_BASE),
      'log',
      logId.toString(DECIMAL_BASE),
    ),
  );

  return response.json();
};

export const getCommunicationLogsByRecipientId = async (regionId, recipientId) => {
  const response = await get(
    join(
      communicationLogUrl,
      'region',
      regionId.toString(DECIMAL_BASE),
      'recipient',
      recipientId.toString(DECIMAL_BASE),
    ),
  );

  return response.json();
};

export const updateCommunicationLogById = async (logId, logData) => {
  const response = await put(
    join(
      communicationLogUrl,
      'log',
      logId.toString(DECIMAL_BASE),
    ),
    logData,
  );

  return response.json();
};

export const deleteCommunicationLogById = async (logId) => {
  const response = await destroy(
    join(
      communicationLogUrl,
      'log',
      logId.toString(DECIMAL_BASE),
    ),
  );

  return response.json();
};

export const createCommunicationLogByRecipientId = async (regionId, recipientId, logData) => {
  const response = await post(
    join(
      communicationLogUrl,
      'region',
      regionId.toString(DECIMAL_BASE),
      'recipient',
      recipientId.toString(DECIMAL_BASE),
    ),
    logData,
  );

  return response.json();
};
