import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getReports } from '../collaborationReports';

describe('CollaboratorReports Fetcher', () => {
  afterEach(() => fetchMock.restore());

  describe('getReports', () => {
    it('fetches collaboration reports', async () => {
      const mockResponse = { rows: [{ id: 1, name: 'Report 1' }] };
      fetchMock.get(join('/api/collaboration-reports'), mockResponse);

      const reports = await getReports();

      expect(fetchMock.called()).toBeTruthy();
      expect(reports).toEqual(mockResponse);
    });
  });
});
