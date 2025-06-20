import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  getCommunicationLogById,
  getCommunicationLogsByRecipientId,
  updateCommunicationLogById,
  deleteCommunicationLogById,
  createCommunicationLogByRecipientId,
} from '../communicationLog';

describe('communcation log fetchers', () => {
  it('getCommunicationLogById', async () => {
    const regionId = 1;
    const logId = 2;
    const url = join(
      'api',
      'communication-logs',
      'region',
      regionId.toString(10),
      'log',
      logId.toString(10),
    );
    const data = { test: 'test' };
    fetchMock.getOnce(url, data);
    await getCommunicationLogById(regionId, logId);
    expect(fetchMock.lastUrl()).toContain(url);
  });
  it('getCommunicationLogsByRecipientId', async () => {
    const regionId = 1;
    const recipientId = 2;
    const url = join(
      'api',
      'communication-logs',
      'region',
      regionId.toString(10),
      'recipient',
      recipientId.toString(10),
    );
    const data = { test: 'test' };
    fetchMock.getOnce(`${url}?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&`, data);
    await getCommunicationLogsByRecipientId(regionId, recipientId, 'communicationDate', 'desc', 0);
    expect(fetchMock.lastUrl()).toContain(url);
  });
  it('updateCommunicationLogById', async () => {
    const logId = 1;
    const url = join(
      'api',
      'communication-logs',
      'log',
      logId.toString(10),
    );
    const data = { test: 'test' };
    fetchMock.putOnce(url, data);
    await updateCommunicationLogById(logId, data);
    expect(fetchMock.lastUrl()).toContain(url);
  });
  it('deleteCommunicationLogById', async () => {
    const logId = 1;
    const url = join(
      'api',
      'communication-logs',
      'log',
      String(logId),
    );
    const data = { test: 'test' };
    fetchMock.deleteOnce(url, data);
    await deleteCommunicationLogById(logId);
    expect(fetchMock.lastUrl()).toContain(url);
  });
  it('createCommunicationLogByRecipientId', async () => {
    const regionId = 1;
    const recipientId = 2;
    const url = join(
      'api',
      'communication-logs',
      'region',
      regionId.toString(10),
      'recipient',
      recipientId.toString(10),
    );
    const data = { test: 'test' };
    fetchMock.postOnce(url, data);
    await createCommunicationLogByRecipientId(regionId, recipientId, data);
    expect(fetchMock.lastUrl()).toContain(url);
  });
});
