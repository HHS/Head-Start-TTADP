/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

export const getRecipientSpotlight = async (sortBy = 'recipientName', sortDir = 'desc', offset = 0, filters, limit = 10) => {
  const limitParam = limit !== undefined && limit !== null ? `&limit=${limit}` : '';
  const queryString = `?sortBy=${sortBy}&direction=${sortDir}&offset=${offset}${limitParam}${filters ? `&${filters}` : ''}`;
  const spotlight = await get(`${recipientUrl}${queryString}`);
  return spotlight.json();
};
