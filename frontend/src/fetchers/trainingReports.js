/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

const eventsUrl = join('/', 'api', 'events');
export const getEventsByStatus = async (status) => {
  const url = join(eventsUrl, 'status', status);
  const res = await get(url);
  return res.json();
};
