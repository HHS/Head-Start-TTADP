// import join from 'url-join';
import fetchMock from 'fetch-mock';

import { fetchCitationsByGrant } from '../citations';

describe('Citations fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('fetches citations', async () => {
    fetchMock.get('/api/citations/region/1?grantIds=1&grantIds=2&reportStartDate=2024-12-03', []);
    await fetchCitationsByGrant(1, [1, 2], '2024-12-03');
    expect(fetchMock.called()).toBeTruthy();
  });
});
