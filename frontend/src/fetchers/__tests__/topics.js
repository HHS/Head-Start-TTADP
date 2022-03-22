import fetchMock from 'fetch-mock';
import { getTopics } from '../topics';

describe('topics fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('fetches topics', async () => {
    fetchMock.get('/api/topic', 200);
    await getTopics();
    expect(fetchMock.called()).toBeTruthy();
  });
});
