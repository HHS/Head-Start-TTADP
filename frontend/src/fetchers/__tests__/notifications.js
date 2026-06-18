import fetchMock from 'fetch-mock';
import { fetchArchivedNotifications, fetchNotifications } from '../notifications';

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
});
