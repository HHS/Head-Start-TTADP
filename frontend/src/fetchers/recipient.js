import join from 'url-join';
import { get } from './index';
import { DECIMAL_BASE, GOALS_PER_PAGE } from '../Constants';
import { filtersToQueryString } from '../utils';

const recipientUrl = join('/', 'api', 'recipient');

export const getRecipient = async (recipientId, regionId = '') => {
  const regionSearch = regionId ? `?region.in[]=${regionId.toString(DECIMAL_BASE)}` : '';
  const id = parseInt(recipientId, DECIMAL_BASE);

  if (Number.isNaN(id)) {
    throw new Error('Recipient ID must be a number');
  }

  const recipient = await get(
    join(recipientUrl, id.toString(DECIMAL_BASE), regionSearch),
  );
  return recipient.json();
};

export const searchRecipients = async (query, filters, params = { sortBy: 'name', direction: 'asc', offset: 0 }) => {
  const querySearch = `?s=${query || ''}`;
  const queryParams = filtersToQueryString(filters);

  const recipients = await get(
    join(recipientUrl, 'search', `${querySearch}&${queryParams}`, `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`),
  );

  return recipients.json();
};

export const getRecipientGoals = async (recipientId, regionId, sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = GOALS_PER_PAGE, filters) => {
  const id = parseInt(recipientId, DECIMAL_BASE);
  if (Number.isNaN(id)) {
    throw new Error('Recipient ID must be a number');
  }

  const idRegion = parseInt(regionId, DECIMAL_BASE);
  if (Number.isNaN(idRegion)) {
    throw new Error('Region ID must be a number');
  }

  const recipientGoalsUrl = join(recipientUrl, recipientId, 'region', regionId, 'goals');
  const goals = await get(`${recipientGoalsUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${filters ? `&${filters}` : ''}`);
  return goals.json();
};
