import join from 'url-join';
import fetchMock from 'fetch-mock';
import { fetchResourceData, fetchTopicResources } from '../Resources';

describe('fetchResourceData', () => {
  afterEach(() => {
    fetchMock.restore();
  });
  it('fetches with the right params', async () => {
    const query = '&region.in[]=1';
    const resourcesUrl = join('/', 'api', 'resources', `?${query}`);
    fetchMock.get(resourcesUrl, {
      activityReports: {
        rows: [],
        count: 0,
        topics: [],
        recipients: [],
      },
    });
    await fetchResourceData(query, {});
    expect(fetchMock.called()).toBeTruthy();
  });

  it('fetches topic resources with the right params', async () => {
    const completeQuery = 'sortBy=1&sortDir=desc&offset=0&limit=10&region.in[]=1';
    const resourcesUrl = join('/', 'api', 'resources', 'topic-resources', `?${completeQuery}`);
    fetchMock.get(resourcesUrl, {});
    const query = 'region.in[]=1';
    await fetchTopicResources(1, 'desc', 0, 10, query);
    expect(fetchMock.called()).toBeTruthy();
  });

  it('fetches topic resources with default params', async () => {
    const completeQuery = '?sortBy=updatedAt&sortDir=desc&offset=0&limit=10';
    const resourcesUrl = join('/', 'api', 'resources', 'topic-resources', `${completeQuery}`);
    fetchMock.get(resourcesUrl, {});
    await fetchTopicResources();
    expect(fetchMock.called()).toBeTruthy();
  });
});
