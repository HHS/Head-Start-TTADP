import fetchMock from 'fetch-mock';
import {
  getRttapa,
  getRttapas,
  createRttapa,
} from '../rttapa';

describe('rttapa fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('gets rttapa', async () => {
    fetchMock.get('/api/rttapa/1', {});
    await getRttapa(1);

    expect(fetchMock.called()).toBeTruthy();
  });

  it('gets rttapas', async () => {
    fetchMock.get('/api/rttapa/region/1/recipient/1?sortBy=reviewDate&direction=desc', []);
    await getRttapas(1, 1, { sortBy: 'reviewDate', direction: 'desc' });

    expect(fetchMock.called()).toBeTruthy();
  });

  it('creates rttapa', async () => {
    fetchMock.post('/api/rttapa', []);
    await createRttapa();

    expect(fetchMock.called()).toBeTruthy();
  });
});
