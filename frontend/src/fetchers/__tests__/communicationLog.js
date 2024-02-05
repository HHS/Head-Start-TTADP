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
    const response = await getCommunicationLogById(regionId, logId);
    expect(response).toEqual(data);
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
    const response = await getCommunicationLogsByRecipientId(regionId, recipientId, 'communicationDate', 'desc', 0);
    expect(response).toEqual(data);
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
    const response = await updateCommunicationLogById(logId, data);
    expect(response).toEqual(data);
  });
  it('deleteCommunicationLogById', async () => {
    const logId = 1;
    const url = join(
      'api',
      'communication-logs',
      'log',
      logId.toString(10),
    );
    const data = { test: 'test' };
    fetchMock.deleteOnce(url, data);
    const response = await deleteCommunicationLogById(logId);
    expect(response).toEqual(data);
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
    const response = await createCommunicationLogByRecipientId(regionId, recipientId, data);
    expect(response).toEqual(data);
  });
});
