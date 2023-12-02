import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import { get } from './index';
import { GOALS_PER_PAGE } from '../Constants';
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

export const getRecipientGoals = async (recipientId, regionId, sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = GOALS_PER_PAGE, filters, goalIds = []) => {
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
  const goals = await get(`${recipientGoalsUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${goalsParam && goalsParam.length ? `&${goalsParam.join('&')}` : ''}${filters ? `&${filters}` : ''}`);
  return goals.json();
};

export const getMergeGoalPermissions = async (recipientId, regionId) => {
  const url = join(recipientUrl, recipientId, 'region', regionId, 'merge-permissions');
  const res = await get(url);
  return res.json();
};

export const getRecipientAndGrantsByUser = async () => {
  const recipients = await get(join(recipientUrl, 'user'));
  return recipients.json();
};

export const getGroupUsers = async (regionIds) => {
  const userGroupUrl = join(recipientUrl, 'user', 'groupUsers');
  const groupUsersURL = `${userGroupUrl}?regionIds=${regionIds.join('&regionIds=')}`;
  // console.log('\n\n\n-----FETCH OWNERS AND IND: ', groupUsersURL);
  const recipients = await get(groupUsersURL);
  return recipients.json();
};

/*
export const getGroupUsers = async (regionIds) => ({
  coOwnerUsers: [{
    id: 1,
    name: 'co-owner1',
    regionId: 1,
  },
  {
    id: 2,
    name: 'co-owner2',
    regionId: 1,
  },
  ],
  individualUsers: [
    {
      id: 1,
      name: 'individual1',
      regionId: 1,
    },
    {
      id: 2,
      name: 'individual2',
      regionId: 1,
    },
  ],
});
*/
export const getRecipientLeadership = async (recipientId, regionId) => {
  const url = join(recipientUrl, recipientId, 'region', regionId, 'leadership');
  const leadership = await get(url);
  return leadership.json();
};
