import join from 'url-join';
import fetchMock from 'fetch-mock';
import fetchResourceData from '../Resources';

describe('fetchResourceData', () => {
  it('fetches with the right params', async () => {
    const query = '&region.in[]=1';
    const resourcesUrl = join('/', 'api', 'resources', `?${query}`);
    fetchMock.get(resourcesUrl, {});
    await fetchResourceData(query);
    expect(fetchMock.called()).toBeTruthy();
  });
});
