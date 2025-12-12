/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

export const getRecipientSpotlight = async (recipientId, regionId, sortBy = 'recipientName', sortDir = 'desc', offset = 0, filters, limit = 10) => {
  const queryString = `?recipientId=${recipientId}&regionId=${regionId}&sortBy=${sortBy}&direction=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`;
  const spotlight = await get(`${recipientUrl}${queryString}`);
  return spotlight.json();
};
