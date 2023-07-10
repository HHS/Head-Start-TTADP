import join from 'url-join';
import { get, put } from './index';

const eventsUrl = join('/', 'api', 'events');

export const eventById = async (id) => {
  const res = await get(`/api/events/id/${id}`);
  return res.json();
};

export const updateEvent = async (id, data) => {
  const res = await put(`/api/events/id/${id}`, data);
  return res.json();
};

export const sessionsByEventId = async (id) => {
  const res = await get(`/api/session-reports/eventId/${String(id)}`);
  return res.json();
};

export const getEventsByStatus = async (status, filters) => {
  const url = join(eventsUrl, status, `?${filters}`);
  const res = await get(url);
  return res.json();
};
