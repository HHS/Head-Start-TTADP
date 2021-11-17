import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getRecipient } from '../recipient';

const recipientUrl = join('/', 'api', 'recipient');

describe('grantee fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('test that it retrieves a recipient', async () => {
    const url = join(recipientUrl, '1', '?region.in[]=1');
    fetchMock.getOnce(url, { name: 'Tim Johnson the Recipient' });
    const res = await getRecipient(1, 1);
    expect(res.name).toBe('Tim Johnson the Recipient');
  });

  it('tests that it requires a int for recipient id', async () => {
    await expect(async () => {
      await getRecipient('tim');
    }).rejects.toEqual(Error('Recipient ID must be a number'));
  });
});
