import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  createSession,
  getSessionByEventIdAndSessionIndex,
  getSessionsByEventId,
  updateSession,
  deleteSession,
  uploadSessionObjectiveFiles,
  deleteSessionObjectiveFile,
  getPossibleSessionParticipants,
} from '../session';

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
  it('getSessionByEventIdAndSessionIndex', async () => {
    const eventId = '1';
    const sessionIndex = '01';
    const response = { id: 1 };
    fetchMock.get(join(sessionsUrl, 'eventId', eventId, 'sessionIndex', sessionIndex), response);
    const result = await getSessionByEventIdAndSessionIndex();
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
});
