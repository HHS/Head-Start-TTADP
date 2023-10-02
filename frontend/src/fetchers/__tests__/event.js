import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  eventById,
  sessionsByEventId,
  updateEvent,
  getEventsByStatus,
  deleteEvent,
} from '../event';
import { EVENT_STATUS } from '../../pages/TrainingReports/constants';

describe('eventById', () => {
  beforeEach(() => {
    fetchMock.get('/api/events/id/1', {
      id: 1,
      name: 'test event',
    });
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('fetches data from the server with the given id', async () => {
    const event = await eventById(1);

    expect(fetchMock.called()).toBe(true);
    expect(fetchMock.lastUrl()).toBe('/api/events/id/1');
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
