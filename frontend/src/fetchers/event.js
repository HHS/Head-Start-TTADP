import { get, put } from './index';

export const eventById = async (id) => {
  const res = await get(`/api/event/id/${id}`);
  return res.json();
};

export const updateEvent = async (id, data) => {
  const res = await put(`/api/event/id/${id}`, data);
  return res.json();
};
