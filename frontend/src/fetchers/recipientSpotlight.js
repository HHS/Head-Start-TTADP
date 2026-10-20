import join from 'url-join';
import { get } from './index';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

export const getRecipientSpotlight = async (
  sortBy = 'recipientName',
  sortDir = 'desc',
  offset = 0,
  filters,
  limit = null,
  grantId = null,
  mustHaveIndicators = false,
  signal = null
) => {
  const limitParam = limit ? `&limit=${limit}` : '';
  const mustHaveIndicatorsParam = mustHaveIndicators
    ? `&mustHaveIndicators=${mustHaveIndicators}`
    : '';
  const queryString = `?sortBy=${sortBy}&direction=${sortDir}&offset=${offset}${limitParam}${filters ? `&${filters}` : ''}${grantId ? `&grantId=${grantId}` : ''}${mustHaveIndicatorsParam}`;
  const spotlight = await get(`${recipientUrl}${queryString}`, signal);
  return spotlight.json();
};

export const getRecipientSpotlightCsv = async (
  sortBy = 'recipientName',
  sortDir = 'desc',
  filters,
  grantId = null,
  mustHaveIndicators = true,
  signal = null
) => {
  const mustHaveIndicatorsParam = mustHaveIndicators
    ? `&mustHaveIndicators=${mustHaveIndicators}`
    : '';
  const queryString = `?sortBy=${sortBy}&direction=${sortDir}&offset=0${filters ? `&${filters}` : ''}${grantId ? `&grantId=${grantId}` : ''}${mustHaveIndicatorsParam}&format=csv`;
  const spotlight = await get(`${recipientUrl}${queryString}`, signal);
  return spotlight.blob();
};
