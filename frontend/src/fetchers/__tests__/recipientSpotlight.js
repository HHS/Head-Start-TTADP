import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getRecipientSpotlight } from '../recipientSpotlight';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

describe('recipientSpotlight fetcher', () => {
  beforeEach(() => fetchMock.reset());
  afterEach(() => fetchMock.restore());

  it('calls the correct url with default parameters', async () => {
    const recipientId = '123';
    const regionId = '1';
    const url = join(recipientUrl, 'recipientId', recipientId.toString(), 'regionId', regionId.toString());
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${url}?sortBy=recipientName&sortDir=desc&offset=0&limit=10`, mockResponse);

    const response = await getRecipientSpotlight(recipientId, regionId);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with custom sort parameters', async () => {
    const recipientId = '123';
    const regionId = '1';
    const sortBy = 'createdAt';
    const sortDir = 'asc';
    const url = join(recipientUrl, 'recipientId', recipientId.toString(), 'regionId', regionId.toString());
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${url}?sortBy=${sortBy}&sortDir=${sortDir}&offset=0&limit=10`, mockResponse);

    const response = await getRecipientSpotlight(recipientId, regionId, sortBy, sortDir);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with custom pagination parameters', async () => {
    const recipientId = '123';
    const regionId = '1';
    const offset = 10;
    const limit = 5;
    const url = join(recipientUrl, 'recipientId', recipientId.toString(), 'regionId', regionId.toString());
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${url}?sortBy=recipientName&sortDir=desc&offset=${offset}&limit=${limit}`, mockResponse);

    const response = await getRecipientSpotlight(recipientId, regionId, 'recipientName', 'desc', offset, null, limit);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with filters', async () => {
    const recipientId = '123';
    const regionId = '1';
    const filters = 'status=active&type=spotlight';
    const url = join(recipientUrl, 'recipientId', recipientId.toString(), 'regionId', regionId.toString());
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${url}?sortBy=recipientName&sortDir=desc&offset=0&limit=10&${filters}`, mockResponse);

    const response = await getRecipientSpotlight(recipientId, regionId, 'recipientName', 'desc', 0, filters);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with all custom parameters', async () => {
    const recipientId = '123';
    const regionId = '1';
    const sortBy = 'updatedAt';
    const sortDir = 'asc';
    const offset = 20;
    const limit = 15;
    const filters = 'status=inactive&type=report';
    const url = join(recipientUrl, 'recipientId', recipientId.toString(), 'regionId', regionId.toString());
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${url}?sortBy=${sortBy}&sortDir=${sortDir}&offset=${offset}&limit=${limit}&${filters}`, mockResponse);

    const response = await getRecipientSpotlight(
      recipientId,
      regionId,
      sortBy,
      sortDir,
      offset,
      filters,
      limit,
    );

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });
});
