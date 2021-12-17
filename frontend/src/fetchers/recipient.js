import join from 'url-join';
import { get } from './index';
import { DECIMAL_BASE } from '../Constants';
import { filtersToQueryString } from '../components/Filter';

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
