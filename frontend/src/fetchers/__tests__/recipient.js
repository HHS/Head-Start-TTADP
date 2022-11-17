import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getRecipient, getRecipientGoals, goalsByIdAndRecipient } from '../recipient';

const recipientUrl = join('/', 'api', 'recipient');

describe('recipient fetcher', () => {
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

  it('goalsByIdAndRecipient throws when given NaN', async () => {
    await expect(goalsByIdAndRecipient([1, 2, 3], 'asdf')).rejects.toThrow(
      'Recipient ID must be a number',
    );
  });

  it('getRecipientGoals throws when given NaN for recipientId', async () => {
    await expect(getRecipientGoals('asdf', 1)).rejects.toThrow(
      'Recipient ID must be a number',
    );
  });

  it('getRecipientGoals throws when given NaN for regionId', async () => {
    await expect(getRecipientGoals(1, 'asdf')).rejects.toThrow(
      'Region ID must be a number',
    );
  });
});
