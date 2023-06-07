import { get, put } from './index';

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
