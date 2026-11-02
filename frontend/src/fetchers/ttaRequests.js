import { DECIMAL_BASE } from '@ttahub/common';
import join from 'url-join';
import { filtersToQueryString } from '../utils';
import { get, post, put } from './index';

const ttaRequestsUrl = '/api/tta-requests';

export const createTtaRequest = async (data) => {
  const ttaRequest = await post(ttaRequestsUrl, data);
  return ttaRequest.json();
};

export const getTtaRequests = async (filters) => {
  const ttaRequests = await get(`${ttaRequestsUrl}?${filtersToQueryString(filters)}`);
  return ttaRequests.json();
};

export const getTtaRequestReviewers = async (regionId) => {
  const reviewers = await get(
    join(ttaRequestsUrl, 'region', regionId.toString(DECIMAL_BASE), 'reviewers')
  );
  return reviewers.json();
};

export const getTtaRequestsByRecipient = async (regionId, recipientId) => {
  const ttaRequests = await get(
    join(
      ttaRequestsUrl,
      'region',
      regionId.toString(DECIMAL_BASE),
      'recipient',
      recipientId.toString(DECIMAL_BASE)
    )
  );
  return ttaRequests.json();
};

export const getTtaRequest = async (ttaRequestId) => {
  const ttaRequest = await get(join(ttaRequestsUrl, ttaRequestId.toString(DECIMAL_BASE)));
  return ttaRequest.json();
};

export const saveTtaRequest = async (ttaRequestId, data) => {
  const ttaRequest = await put(join(ttaRequestsUrl, ttaRequestId.toString(DECIMAL_BASE)), data);
  return ttaRequest.json();
};

export const submitTtaRequest = async (ttaRequestId, data) => {
  const ttaRequest = await put(
    join(ttaRequestsUrl, ttaRequestId.toString(DECIMAL_BASE), 'submit'),
    data
  );
  return ttaRequest.json();
};
