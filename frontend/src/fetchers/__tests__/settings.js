import fetchMock from 'fetch-mock';
import {
  unsubscribe,
  subscribe,
  updateSettings,
  getEmailSettings,
} from '../settings';

describe('settings fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('updates settings', async () => {
    fetchMock.put('/api/settings', []);
    await updateSettings([]);

    expect(fetchMock.called()).toBeTruthy();
  });

  it('gets email settings', async () => {
    fetchMock.get('/api/settings/email', []);
    await getEmailSettings();

    expect(fetchMock.called()).toBeTruthy();
  });

  it('subscribes', async () => {
    fetchMock.put('/api/settings/email/subscribe', 204);
    await subscribe();

    expect(fetchMock.called()).toBeTruthy();
  });

  it('unsubscribes', async () => {
    fetchMock.put('/api/settings/email/unsubscribe', 204);
    await unsubscribe();

    expect(fetchMock.called()).toBeTruthy();
  });
});
