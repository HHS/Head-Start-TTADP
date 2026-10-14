import { DECIMAL_BASE } from '@ttahub/common';
import join from 'url-join';
import { get, post, put } from './index';

const ttaRequestsUrl = '/api/tta-requests';

export const createTtaRequest = async (data) => {
  const ttaRequest = await post(ttaRequestsUrl, data);
  return ttaRequest.json();
};

export const getTtaRequest = async (ttaRequestId) => {
  const ttaRequest = await get(join(ttaRequestsUrl, ttaRequestId.toString(DECIMAL_BASE)));
  return ttaRequest.json();
};

export const saveTtaRequest = async (ttaRequestId, data) => {
  const ttaRequest = await put(join(ttaRequestsUrl, ttaRequestId.toString(DECIMAL_BASE)), data);
  return ttaRequest.json();
};
