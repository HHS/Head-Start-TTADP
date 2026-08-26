import fetchMock from 'fetch-mock';
import {
  archiveNotification,
  fetchArchivedNotifications,
  fetchNotifications,
  viewNotification,
} from '../notifications';

describe('notifications fetcher', () => {
  beforeEach(() => fetchMock.reset());

  describe('fetchNotifications', () => {
    it('calls GET /api/notifications', async () => {
      fetchMock.get('/api/notifications?', []);
      await fetchNotifications();
      expect(fetchMock.called()).toBeTruthy();
    });

    it('appends sort params from sortConfig', async () => {
      fetchMock.get((url) => url.includes('/api/notifications'), []);
      await fetchNotifications({
        sortConfig: { sortBy: 'triggeredAt', direction: 'DESC' },
      });
      const calledUrl = fetchMock.lastUrl();
      expect(calledUrl).toContain('sortBy=triggeredAt');
      expect(calledUrl).toContain('sortDir=DESC');
      expect(fetchMock.called()).toBeTruthy();
    });

    it('returns parsed JSON', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      fetchMock.get((url) => url.includes('/api/notifications'), mockData);
      const result = await fetchNotifications();
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchArchivedNotifications', () => {
    it('calls GET /api/notifications/archived', async () => {
      fetchMock.get((url) => url.includes('/api/notifications/archived'), []);
      await fetchArchivedNotifications();
      expect(fetchMock.called()).toBeTruthy();
      expect(fetchMock.lastUrl()).toContain('/archived');
    });

    it('appends sort params from sortConfig', async () => {
      fetchMock.get((url) => url.includes('/api/notifications/archived'), []);
      await fetchArchivedNotifications({
        sortConfig: { sortBy: 'createdAt', direction: 'ASC' },
      });
      const calledUrl = fetchMock.lastUrl();
      expect(calledUrl).toContain('sortBy=createdAt');
      expect(calledUrl).toContain('sortDir=ASC');
    });

    it('returns parsed JSON', async () => {
      const mockData = [{ id: 3, archivedAt: '2026-01-01' }];
      fetchMock.get((url) => url.includes('/api/notifications/archived'), mockData);
      const result = await fetchArchivedNotifications();
      expect(result).toEqual(mockData);
    });
  });

  describe('archiveNotification', () => {
    it('PUTs /api/notifications/:id with archivedAt body', async () => {
      const mockResponse = { id: 7, archivedAt: '2026-06-25T00:00:00.000Z' };
      fetchMock.put('/api/notifications/7', mockResponse);

      await archiveNotification('7');

      expect(fetchMock.called('/api/notifications/7')).toBe(true);
      const lastCall = fetchMock.lastCall('/api/notifications/7');
      const body = JSON.parse(String(lastCall[1].body));
      expect(body).toHaveProperty('archivedAt');
      expect(typeof body.archivedAt).toBe('string');
    });

    it('returns parsed JSON', async () => {
      const mockResponse = { id: 7, archivedAt: '2026-06-25T00:00:00.000Z' };
      fetchMock.put('/api/notifications/7', mockResponse);

      const result = await archiveNotification('7');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('viewNotification', () => {
    it('PUTs /api/notifications/:id with viewedAt body', async () => {
      const mockResponse = { id: 8, viewedAt: '2026-06-25T00:00:00.000Z' };
      fetchMock.put('/api/notifications/8', mockResponse);

      await viewNotification('8');

      expect(fetchMock.called('/api/notifications/8')).toBe(true);
      const lastCall = fetchMock.lastCall('/api/notifications/8');
      const body = JSON.parse(String(lastCall[1].body));
      expect(body).toHaveProperty('viewedAt');
      expect(typeof body.viewedAt).toBe('string');
    });

    it('returns parsed JSON', async () => {
      const mockResponse = { id: 8, viewedAt: '2026-06-25T00:00:00.000Z' };
      fetchMock.put('/api/notifications/8', mockResponse);

      const result = await viewNotification('8');

      expect(result).toEqual(mockResponse);
    });
  });
});
