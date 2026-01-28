import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  createSession,
  getSessionBySessionId,
  getSessionsByEventId,
  updateSession,
  deleteSession,
  uploadSessionObjectiveFiles,
  deleteSessionObjectiveFile,
  getPossibleSessionParticipants,
  getGroupsForSession,
  getSessionReportsTable,
  getSessionReportsCSV,
  getSessionReportsCSVById,
} from '../session';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  blobToCsvDownload: jest.fn(),
}));

const sessionsUrl = join('/', 'api', 'session-reports');

describe('session fetchers', () => {
  it('createSession', async () => {
    const eventId = 1;
    const data = {};
    const response = { id: 1 };
    fetchMock.post(sessionsUrl, response);
    const result = await createSession(eventId, data);
    expect(result).toEqual(response);
  });
  it('getSessionBySessionId', async () => {
    const sessionId = '1';
    const response = { id: 1 };
    fetchMock.get(join(sessionsUrl, 'id', sessionId), response);
    const result = await getSessionBySessionId(sessionId);
    expect(result).toEqual(response);
  });
  it('getSessionsByEventId', async () => {
    const eventId = '1';
    const response = [{ id: 1 }];
    fetchMock.get(join(sessionsUrl, 'eventId', eventId), response);
    const result = await getSessionsByEventId(eventId);
    expect(result).toEqual(response);
  });
  it('updateSession', async () => {
    const sessionId = '1';
    const data = {};
    const response = { id: 1 };
    fetchMock.put(join(sessionsUrl, 'id', sessionId), response);
    const result = await updateSession(sessionId, data);
    expect(result).toEqual(response);
  });
  it('deleteSession', async () => {
    const sessionId = '1';
    const response = { id: 1 };
    fetchMock.delete(join(sessionsUrl, 'id', sessionId), response);
    const result = await deleteSession(sessionId);
    expect(result).toEqual(response);
  });
  it('uploadSessionObjectiveFiles', async () => {
    const sessionId = '1';
    const files = [];
    const response = { id: 1 };
    fetchMock.post(join('/', 'api', 'files'), response);
    const result = await uploadSessionObjectiveFiles(sessionId, files);
    expect(result).toEqual(response);
  });
  it('deleteSessionObjectiveFile', async () => {
    const sessionId = '1';
    const fileId = '1';
    const response = { id: 1 };
    fetchMock.delete(join('/', 'api', 'files', 's', sessionId, fileId), response);
    const result = await deleteSessionObjectiveFile(sessionId, fileId);
    expect(result).toEqual(200);
  });
  it('getPossibleSessionParticipants', async () => {
    const regionId = '1';
    const response = [{ id: 1 }];
    fetchMock.get(join(sessionsUrl, 'participants', regionId), response);
    const result = await getPossibleSessionParticipants(regionId);
    expect(result).toEqual(response);
  });
  it('returns the groups', async () => {
    const expected = { id: 1 };
    fetchMock.get(join(sessionsUrl, 'groups', '?region=1'), expected);
    const report = await getGroupsForSession('1');
    expect(report).toEqual(expected);
  });

  describe('getSessionReportsTable', () => {
    afterEach(() => fetchMock.restore());

    it('fetches session reports with sort config', async () => {
      const response = { rows: [{ id: 1 }], count: 1 };
      const sortConfig = {
        direction: 'asc', sortBy: 'sessionName', perPage: 10, offset: 0, activePage: 1,
      };
      fetchMock.get(`begin:${sessionsUrl}`, response);
      const result = await getSessionReportsTable(sortConfig);
      expect(result).toEqual(response);
    });

    it('fetches session reports with filters', async () => {
      const response = { rows: [], count: 0 };
      const sortConfig = { direction: 'desc', sortBy: 'startDate' };
      const filters = [{ topic: 'region', condition: 'is', query: 14 }];
      fetchMock.get(`begin:${sessionsUrl}`, response);
      const result = await getSessionReportsTable(sortConfig, filters);
      expect(result).toEqual(response);
    });
  });

  describe('getSessionReportsCSV', () => {
    afterEach(() => fetchMock.restore());

    it('downloads CSV for all reports', async () => {
      const mockCsvData = 'id,name\n1,Report 1';
      const sortConfig = { direction: 'asc', sortBy: 'sessionName' };
      fetchMock.get(`begin:${sessionsUrl}`, mockCsvData);
      await getSessionReportsCSV(sortConfig);
      expect(fetchMock.called()).toBeTruthy();
    });

    it('downloads CSV with filters', async () => {
      const mockCsvData = 'id,name\n1,Report 1';
      const sortConfig = { direction: 'asc', sortBy: 'sessionName' };
      const filters = [{ topic: 'region', condition: 'is', query: 14 }];
      fetchMock.get(`begin:${sessionsUrl}`, mockCsvData);
      await getSessionReportsCSV(sortConfig, filters);
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('getSessionReportsCSVById', () => {
    afterEach(() => fetchMock.restore());

    it('downloads CSV for specific report IDs', async () => {
      const mockCsvData = 'id,name\n1,Report 1\n2,Report 2';
      const ids = [1, 2];
      const sortConfig = { direction: 'asc', sortBy: 'sessionName' };
      fetchMock.get(`begin:${sessionsUrl}`, mockCsvData);
      await getSessionReportsCSVById(ids, sortConfig);
      expect(fetchMock.called()).toBeTruthy();
    });

    it('downloads CSV with IDs and filters', async () => {
      const mockCsvData = 'id,name\n1,Report 1';
      const ids = [1];
      const sortConfig = { direction: 'asc', sortBy: 'sessionName' };
      const filters = [{ topic: 'region', condition: 'is', query: 14 }];
      fetchMock.get(`begin:${sessionsUrl}`, mockCsvData);
      await getSessionReportsCSVById(ids, sortConfig, filters);
      expect(fetchMock.called()).toBeTruthy();
    });
  });
});
