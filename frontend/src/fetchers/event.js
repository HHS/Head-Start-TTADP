import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import { get, put, destroy } from './index';

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

export const deleteEvent = async (eventId) => {
  await destroy(join(eventsUrl, 'id', eventId.toString(DECIMAL_BASE)));
};

export const findEventCreators = async (creatorsEventId) => {
  const res = await get(`/api/events/creators/${String(creatorsEventId)}`);
  return res.json();
};
