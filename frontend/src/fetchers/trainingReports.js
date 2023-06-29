/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const eventsUrl = join('/', 'api', 'events');
export const getEventsByStatus = async (status, filters) => {
  const url = join(eventsUrl, status, `?${filters}`);
  const res = await get(url);
  return res.json();
};
