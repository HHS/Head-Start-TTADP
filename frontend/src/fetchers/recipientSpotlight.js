/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

export const getRecipientSpotlight = async (sortBy = 'recipientName', sortDir = 'desc', offset = 0, filters, limit = 10) => {
  // eslint-disable-next-line no-console
  console.log('[recipientSpotlight.js] getRecipientSpotlight called with:', {
    sortBy, sortDir, offset, filters, limit,
  });
  const limitParam = limit !== undefined && limit !== null ? `&limit=${limit}` : '';
  // eslint-disable-next-line no-console
  console.log('[recipientSpotlight.js] limitParam:', limitParam, '| limit was:', limit);
  const queryString = `?sortBy=${sortBy}&direction=${sortDir}&offset=${offset}${limitParam}${filters ? `&${filters}` : ''}`;
  // eslint-disable-next-line no-console
  console.log('[recipientSpotlight.js] Full URL:', `${recipientUrl}${queryString}`);
  const spotlight = await get(`${recipientUrl}${queryString}`);
  return spotlight.json();
};
