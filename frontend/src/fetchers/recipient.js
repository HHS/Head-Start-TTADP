import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import { get } from './index';
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
    join(
      recipientUrl,
      'search',
      `${querySearch}${queryParams ? `&${queryParams}` : ''}`,
      `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`,
    ),
  );

  return recipients.json();
};

export const goalsByIdAndRecipient = async (goalIds, recipientId) => {
  const id = parseInt(recipientId, DECIMAL_BASE);
  if (Number.isNaN(id)) {
    throw new Error('Recipient ID must be a number');
  }

  const recipientGoalsUrl = join(recipientUrl, recipientId, 'goals');
  const goals = await get(`${recipientGoalsUrl}?goalIds=${goalIds.join('&goalIds=')}`);
  return goals.json();
};

export const getRecipientGoals = async (
  recipientId,
  regionId,
  queryString,
  filters,
  goalIds = [],
) => {
  const id = parseInt(recipientId, DECIMAL_BASE);
  if (Number.isNaN(id)) {
    throw new Error('Recipient ID must be a number');
  }

  const idRegion = parseInt(regionId, DECIMAL_BASE);
  if (Number.isNaN(idRegion)) {
    throw new Error('Region ID must be a number');
  }

  const goalsParam = goalIds.map((goalId) => `goalIds=${goalId}`);
  const recipientGoalsUrl = join(recipientUrl, recipientId, 'region', regionId, 'goals');
  const url = `${recipientGoalsUrl}?${queryString}${goalsParam && goalsParam.length ? `&${goalsParam.join('&')}` : ''}${filters ? `&${filters}` : ''}`;
  const goals = await get(url);
  return goals.json();
};

export const getRecipientAndGrantsByUser = async () => {
  const recipients = await get(join(recipientUrl, 'user'));
  return recipients.json();
};

export const getRecipientLeadership = async (recipientId, regionId) => {
  const url = join(recipientUrl, recipientId, 'region', regionId, 'leadership');
  const leadership = await get(url);
  return leadership.json();
};
