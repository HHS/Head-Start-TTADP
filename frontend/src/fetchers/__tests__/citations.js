import fetchMock from 'fetch-mock';
import { fetchCitationsByGrant, fetchCitationTextByName } from '../citations';

describe('Citations fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('fetches citations', async () => {
    fetchMock.get('/api/citations/region/1?grantIds=1&grantIds=2&reportStartDate=2024-12-03', []);
    await fetchCitationsByGrant(1, [1, 2], '2024-12-03');
    expect(fetchMock.called('/api/citations/region/1?grantIds=1&grantIds=2&reportStartDate=2024-12-03')).toBeTruthy();
  });

  it('fetches citation text', async () => {
    fetchMock.get('/api/citations/text?citationIds=123&citationIds=456', []);
    await fetchCitationTextByName(['123', '456']);
    expect(fetchMock.called('/api/citations/text?citationIds=123&citationIds=456')).toBeTruthy();
  });

  it('dedupes citation IDs when fetching citation text', async () => {
    fetchMock.get('/api/citations/text?citationIds=123&citationIds=456', []);
    await fetchCitationTextByName(['123', '123', '456', '456']);
    expect(fetchMock.called('/api/citations/text?citationIds=123&citationIds=456')).toBeTruthy();
  });
});
