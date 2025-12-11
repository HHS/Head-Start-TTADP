import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getRecipientSpotlight } from '../recipientSpotlight';

const recipientUrl = join('/', 'api', 'recipient-spotlight');

describe('recipientSpotlight fetcher', () => {
  beforeEach(() => fetchMock.reset());
  afterEach(() => fetchMock.restore());

  it('calls the correct url with default parameters', async () => {
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${recipientUrl}?sortBy=recipientName&direction=desc&offset=0&limit=10`, mockResponse);

    const response = await getRecipientSpotlight();

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with custom sort parameters', async () => {
    const sortBy = 'createdAt';
    const sortDir = 'asc';
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${recipientUrl}?sortBy=${sortBy}&direction=${sortDir}&offset=0&limit=10`, mockResponse);

    const response = await getRecipientSpotlight(sortBy, sortDir);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with custom pagination parameters', async () => {
    const offset = 10;
    const limit = 5;
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${recipientUrl}?sortBy=recipientName&direction=desc&offset=${offset}&limit=${limit}`, mockResponse);

    const response = await getRecipientSpotlight('recipientName', 'desc', offset, null, limit);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with filters including recipientId and regionId', async () => {
    const filters = 'recipientId.in=123&region.in=1';
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${recipientUrl}?sortBy=recipientName&direction=desc&offset=0&limit=10&${filters}`, mockResponse);

    const response = await getRecipientSpotlight('recipientName', 'desc', 0, filters);

    expect(response).toEqual(mockResponse);
    expect(fetchMock.called()).toBe(true);
  });

  it('calls the correct url with all custom parameters', async () => {
    const sortBy = 'updatedAt';
    const sortDir = 'asc';
    const offset = 20;
    const limit = 15;
    const filters = 'recipientId.in=123&region.in=1&status=inactive';
    const mockResponse = { data: 'test data' };

    fetchMock.getOnce(`${recipientUrl}?sortBy=${sortBy}&direction=${sortDir}&offset=${offset}&limit=${limit}&${filters}`, mockResponse);

    const response = await getRecipientSpotlight(
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
