import join from 'url-join';
import fetchMock from 'fetch-mock';
import {
  getRecipient,
  getRecipientGoals,
  goalsByIdAndRecipient,
  getRecipientLeadership,
  getMergeGoalPermissions,
  markRecipientGoalGroupInvalid,
  getRecipientGoalGroup,
} from '../recipient';

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

  it('getRecipientLeadership', async () => {
    const url = join(recipientUrl, '1', 'region', '1', 'leadership');
    fetchMock.getOnce(url, { name: 'Tim Johnson the Recipient' });
    const res = await getRecipientLeadership('1', '1');
    expect(res.name).toBe('Tim Johnson the Recipient');
  });

  it('getMergeGoalPermissions', async () => {
    const url = join(recipientUrl, '1', 'region', '1', 'merge-permissions');
    fetchMock.getOnce(url, { canMerge: true });
    const res = await getMergeGoalPermissions('1', '1');
    expect(res.canMerge).toBe(true);
  });

  it('markRecipientGoalGroupInvalid', async () => {
    const url = join(recipientUrl, '1', 'region', '1', 'group', '1', 'invalid');
    fetchMock.put(url, { message: 'success' });
    const res = await markRecipientGoalGroupInvalid(1, 1, 1);
    expect(res.message).toBe('success');
  });

  it('getRecipientGoalGroup', async () => {
    const url = join(recipientUrl, '1', 'region', '1', 'group', '1');
    fetchMock.get(url, { name: 'Tim Johnson the Recipient' });
    const res = await getRecipientGoalGroup(1, 1, 1);
    expect(res.name).toBe('Tim Johnson the Recipient');
  });
});
