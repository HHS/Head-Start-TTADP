import { DECIMAL_BASE } from '@ttahub/common';
import join from 'url-join';
import { GOALS_PER_PAGE } from '../Constants';
import { filtersToQueryString } from '../utils';
import { get } from './index';

const recipientUrl = join('/', 'api', 'recipient');

const parseNonNegativeInteger = (value) => {
  const isWholeNumber =
    (typeof value === 'number' && Number.isInteger(value)) ||
    (typeof value === 'string' && /^[0-9]+$/.test(value));

  if (!isWholeNumber) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

const parsePositiveInteger = (value) => {
  const parsedValue = parseNonNegativeInteger(value);
  return parsedValue !== null && parsedValue > 0 ? parsedValue : null;
};

export const getRecipient = async (recipientId, regionId = '') => {
  const regionSearch = regionId ? `?region.in[]=${regionId.toString(DECIMAL_BASE)}` : '';
  const id = parseInt(recipientId, DECIMAL_BASE);

  if (Number.isNaN(id)) {
    throw new Error('Recipient ID must be a number');
  }

  const recipient = await get(join(recipientUrl, id.toString(DECIMAL_BASE), regionSearch));
  return recipient.json();
};

export const searchRecipients = async (
  query,
  filters,
  params = { sortBy: 'name', direction: 'asc', offset: 0 }
) => {
  const querySearch = `?s=${query || ''}`;
  const queryParams = filtersToQueryString(filters);

  const recipients = await get(
    join(
      recipientUrl,
      'search',
      `${querySearch}${queryParams ? `&${queryParams}` : ''}`,
      `&sortBy=${params.sortBy}&direction=${params.direction}&offset=${params.offset}`
    )
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
  sortBy = 'updatedAt',
  sortDir = 'desc',
  offset = 0,
  limit = GOALS_PER_PAGE,
  filters,
  goalIds = []
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
  const goals = await get(
    `${recipientGoalsUrl}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}${goalsParam && goalsParam.length ? `&${goalsParam.join('&')}` : ''}${filters ? `&${filters}` : ''}`
  );
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

export const getRecipientTimeline = async (
  recipientId,
  regionId,
  {
    direction = 'desc',
    filters = [],
    excludeMultiRecipientCommunications = false,
    limit = 25,
    offset = 0,
  } = {}
) => {
  const id = parsePositiveInteger(recipientId);
  if (id === null) {
    throw new Error('Recipient ID must be a positive integer');
  }

  const idRegion = parsePositiveInteger(regionId);
  if (idRegion === null) {
    throw new Error('Region ID must be a positive integer');
  }

  const parsedLimit = parsePositiveInteger(limit);
  if (parsedLimit === null) {
    throw new Error('Limit must be a positive integer');
  }

  const parsedOffset = parseNonNegativeInteger(offset);
  if (parsedOffset === null) {
    throw new Error('Offset must be a non-negative integer');
  }

  const controls = new URLSearchParams({
    direction,
    limit: String(parsedLimit),
    offset: String(parsedOffset),
  });
  controls.set(
    'excludeMultiRecipientCommunications',
    String(excludeMultiRecipientCommunications)
  );
  const filterQuery = filtersToQueryString(filters);

  const url = join(
    recipientUrl,
    id.toString(DECIMAL_BASE),
    'region',
    idRegion.toString(DECIMAL_BASE),
    'timeline'
  );
  const query = [filterQuery, controls.toString()].filter(Boolean).join('&');
  const timeline = await get(`${url}?${query}`);
  return timeline.json();
};
