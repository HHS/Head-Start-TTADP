/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

export const getRecipientSpotlight = async (recipientId, regionId, sortBy = 'recipientName', sortDir = 'desc', offset = 0, filters, limit = 10) => {
  const recipientGoalsUrl = join(recipientUrl, 'recipientId', recipientId, 'regionId', regionId);
  const spotlight = await get(`${recipientGoalsUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  return spotlight.json();
};
