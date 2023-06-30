import fetchMock from 'fetch-mock';

import { eventById, sessionsByEventId, updateEvent } from '../event';

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
