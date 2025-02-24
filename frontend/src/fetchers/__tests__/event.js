import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  eventById,
  sessionsByEventId,
  updateEvent,
  getEventsByStatus,
  deleteEvent,
  getEventAlerts,
  completeEvent,
  suspendEvent,
  resumeEvent,
} from '../event';
import { EVENT_STATUS } from '../../pages/TrainingReports/constants';

describe('eventById', () => {
  afterEach(() => {
    fetchMock.reset();
  });

  it('fetches data from the server with the given id', async () => {
    fetchMock.get('/api/events/id/1', {
      id: 1,
      name: 'test event',
    });
    const event = await eventById(1);

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');
    expect(event).toEqual({ id: 1, name: 'test event' });
  });

  it('fetches data from the server with the given id and accepts query param', async () => {
    fetchMock.get('/api/events/id/1?readOnly=true', {
      id: 1,
      name: 'test event',
    });
    const event = await eventById(1, true);

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1?readOnly=true');
    expect(event).toEqual({ id: 1, name: 'test event' });
  });
});

describe('updateEvent', () => {
  beforeEach(() => {
    fetchMock.put('/api/events/id/1', {
      id: 1,
      name: 'updated test event',
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('updates the event on the server with the given id and data', async () => {
    const eventData = { name: 'updated test event' };
    const event = await updateEvent(1, eventData);

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');

    const lastOptions = fetchMock.lastOptions();
    expect(lastOptions.method).toBe('PUT');
    expect(lastOptions.body).toBe(JSON.stringify(eventData));
    expect(event).toEqual({ id: 1, name: 'updated test event' });
  });
});

describe('sessionsByEventId', () => {
  beforeEach(() => {
    fetchMock.get('/api/session-reports/eventId/1', {
      id: 1,
      name: 'updated test event',
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('updates the event on the server with the given id and data', async () => {
    const event = await sessionsByEventId(1);

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/session-reports/eventId/1');
    expect(event).toEqual({ id: 1, name: 'updated test event' });
  });
});

describe('getEventsByStatus', () => {
  it('fetches events by status', async () => {
    const eventUrl2 = join('/', 'api', 'events', EVENT_STATUS.NOT_STARTED);
    fetchMock.get(eventUrl2, []);
    await getEventsByStatus(EVENT_STATUS.NOT_STARTED, '');
    expect(fetchMock.called()).toBeTruthy();
  });
});

describe('deleteEvent', () => {
  beforeEach(() => {
    const status = { status: 200 };
    fetchMock.delete('/api/events/id/1', status);
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('delete the event with the given id', async () => {
    await deleteEvent(1);
    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');
    expect(fetchMock.called()).toBeTruthy();
  });
});

describe('getEventAlerts', () => {
  afterEach(() => {
    fetchMock.reset();
  });
  it('fetches alerts from the server', async () => {
    fetchMock.get('/api/events/alerts', { alerts: [] });
    const alerts = await getEventAlerts();
    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/alerts');
    expect(alerts).toEqual({ alerts: [] });
  });
});

describe('completeEvent', () => {
  beforeEach(() => {
    fetchMock.put('/api/events/id/1', {
      id: 1,
      name: 'test event',
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('completes the event on the server with the given id', async () => {
    const event = await completeEvent('1', { ownerId: 1, regionId: 1, data: {} });

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');
    expect(event).toEqual({ id: 1, name: 'test event' });
  });
});

describe('suspendEvent', () => {
  beforeEach(() => {
    fetchMock.put('/api/events/id/1', {
      id: 1,
      name: 'test event',
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('suspends the event on the server with the given id', async () => {
    const event = await suspendEvent('1', { ownerId: 1, regionId: 1, data: {} });

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');
    expect(event).toEqual({ id: 1, name: 'test event' });
  });
});

describe('resumeEvent', () => {
  beforeEach(() => {
    fetchMock.put('/api/events/id/1', {
      id: 1,
      name: 'test event',
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('resumes the event on the server with the given id and status', async () => {
    const event = await resumeEvent('1', { ownerId: 1, regionId: 1, data: {} }, 'In progress');

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');
    expect(event).toEqual({ id: 1, name: 'test event' });
  });
});
