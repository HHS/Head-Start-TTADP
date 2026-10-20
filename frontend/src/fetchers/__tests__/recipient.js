import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  getRecipient,
  getRecipientGoals,
  getRecipientLeadership,
  getRecipientTimeline,
  goalsByIdAndRecipient,
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
      'Recipient ID must be a number'
    );
  });

  it('getRecipientGoals throws when given NaN for recipientId', async () => {
    await expect(getRecipientGoals('asdf', 1)).rejects.toThrow('Recipient ID must be a number');
  });

  it('getRecipientGoals throws when given NaN for regionId', async () => {
    await expect(getRecipientGoals(1, 'asdf')).rejects.toThrow('Region ID must be a number');
  });

  it('getRecipientLeadership', async () => {
    const url = join(recipientUrl, '1', 'region', '1', 'leadership');
    fetchMock.getOnce(url, { name: 'Tim Johnson the Recipient' });
    const res = await getRecipientLeadership('1', '1');
    expect(res.name).toBe('Tim Johnson the Recipient');
  });

  it('getRecipientTimeline sends dotted filters, sort direction, and the multi-recipient switch', async () => {
    const filters = [
      { topic: 'date', condition: 'is within', query: '07/01/2026-07/31/2026' },
      {
        topic: 'eventType',
        condition: 'is',
        query: ['Email communication', 'Phone communication'],
      },
    ];
    const controls = new URLSearchParams({
      direction: 'asc',
      limit: '25',
      offset: '25',
    });
    controls.set('excludeMultiRecipientCommunications', 'true');
    const filterQuery =
      'date.win=2026%2F07%2F01-2026%2F07%2F31&eventType.in[]=Email%20communication&eventType.in[]=Phone%20communication';
    const url = `${join(recipientUrl, '1', 'region', '2', 'timeline')}?${filterQuery}&${controls.toString()}`;
    fetchMock.getOnce(url, { count: 0, events: [] });

    const result = await getRecipientTimeline('1', '2', {
      direction: 'asc',
      limit: 25,
      offset: 25,
      filters,
      excludeMultiRecipientCommunications: true,
    });

    expect(result).toEqual({ count: 0, events: [] });
  });

  it('getRecipientTimeline rejects an invalid recipient id', async () => {
    await expect(getRecipientTimeline('not-a-number', '1')).rejects.toThrow(
      'Recipient ID must be a positive integer'
    );
  });

  it('getRecipientTimeline rejects an invalid region id', async () => {
    await expect(getRecipientTimeline('1', 'not-a-number')).rejects.toThrow(
      'Region ID must be a positive integer'
    );
  });

  it.each([
    ['recipient', '1abc', '1', 'Recipient ID'],
    ['recipient', '1.5', '1', 'Recipient ID'],
    ['recipient', '9007199254740992', '1', 'Recipient ID'],
    ['region', '1', '1abc', 'Region ID'],
    ['region', '1', '1.5', 'Region ID'],
    ['region', '1', '9007199254740992', 'Region ID'],
  ])(
    'getRecipientTimeline rejects a malformed %s ID',
    async (_type, recipientId, regionId, error) => {
      await expect(getRecipientTimeline(recipientId, regionId)).rejects.toThrow(
        `${error} must be a positive integer`
      );
    }
  );

  it.each([
    [{ limit: 0 }, 'Limit must be a positive integer'],
    [{ limit: Number.NaN }, 'Limit must be a positive integer'],
    [{ limit: '25abc' }, 'Limit must be a positive integer'],
    [{ offset: -1 }, 'Offset must be a non-negative integer'],
    [{ offset: 1.5 }, 'Offset must be a non-negative integer'],
    [{ offset: null }, 'Offset must be a non-negative integer'],
  ])('getRecipientTimeline rejects malformed pagination %j', async (pagination, error) => {
    await expect(getRecipientTimeline('1', '2', pagination)).rejects.toThrow(error);
  });
});
