import { getSessionReports, downloadSessionReports } from '../sessionReports';
import { get } from '../index';

jest.mock('../index');

describe('sessionReports fetcher', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionReports', () => {
    it('fetches reports with default parameters', async () => {
      const mockData = { count: 1, rows: [{ id: 1 }] };
      get.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await getSessionReports();

      expect(get).toHaveBeenCalledWith(
        '/api/session-reports?sortBy=id&sortDir=desc&offset=0&limit=10',
      );
      expect(result).toEqual(mockData);
    });

    it('fetches reports with custom parameters', async () => {
      const mockData = { count: 2, rows: [{ id: 1 }, { id: 2 }] };
      get.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await getSessionReports('eventName', 'asc', 10, 20, 'in[]=1');

      expect(get).toHaveBeenCalledWith(
        '/api/session-reports?sortBy=eventName&sortDir=asc&offset=10&limit=20&in[]=1',
      );
      expect(result).toEqual(mockData);
    });

    it('fetches reports without filters', async () => {
      const mockData = { count: 1, rows: [{ id: 1 }] };
      get.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await getSessionReports('id', 'desc', 0, 10, '');

      expect(get).toHaveBeenCalledWith(
        '/api/session-reports?sortBy=id&sortDir=desc&offset=0&limit=10',
      );
      expect(result).toEqual(mockData);
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Network error');
      get.mockRejectedValue(error);

      await expect(getSessionReports()).rejects.toThrow('Network error');
    });
  });

  describe('downloadSessionReports', () => {
    it('downloads reports and returns blob', async () => {
      const mockBlob = new Blob(['test']);
      get.mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const result = await downloadSessionReports('/api/session-reports/download?format=csv');

      expect(get).toHaveBeenCalledWith('/api/session-reports/download?format=csv');
      expect(result).toEqual(mockBlob);
    });

    it('handles download errors', async () => {
      const error = new Error('Download failed');
      get.mockRejectedValue(error);

      await expect(downloadSessionReports('/api/session-reports/download?format=csv')).rejects.toThrow('Download failed');
    });
  });
});
