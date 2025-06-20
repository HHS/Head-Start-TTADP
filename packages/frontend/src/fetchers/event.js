import join from 'url-join';
import { DECIMAL_BASE } from '@ttahub/common';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common/src/constants';
import { get, put, destroy } from './index';

const eventsUrl = join('/', 'api', 'events');

export const eventById = async (id, readOnly = false) => {
  let url = `/api/events/id/${id}`;
  if (readOnly) {
    url += '?readOnly=true';
  }
  const res = await get(url);
  return res.json();
};

export const updateEvent = async (id, data) => {
  const res = await put(`/api/events/id/${id}`, data);
  return res.json();
};

export const completeEvent = async (id, data) => updateEvent(id, {
  ...data,
  data: {
    ...data.data,
    status: TRAINING_REPORT_STATUSES.COMPLETE,
  },
});

export const suspendEvent = async (id, data) => updateEvent(id, {
  ...data,
  data: {
    ...data.data,
    status: TRAINING_REPORT_STATUSES.SUSPENDED,
  },
});

export const resumeEvent = async (id, data, status) => updateEvent(id, {
  ...data,
  data: {
    ...data.data,
    status,
  },
});

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

export const getEventAlerts = async () => {
  const res = await get(join(eventsUrl, 'alerts'));
  return res.json();
};
