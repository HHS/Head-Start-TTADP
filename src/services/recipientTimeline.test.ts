import { getRecipientTimeline } from './recipientTimeline';

describe('getRecipientTimeline', () => {
  it('returns the empty timeline contract', async () => {
    const result = await getRecipientTimeline({
      recipientId: 100000,
      regionId: 1,
      limit: 20,
      offset: 0,
      sortBy: 'date',
      direction: 'desc',
      filters: [],
      excludeMultiRecipientCommunications: false,
    });

    expect(result).toEqual({
      count: 0,
      events: [],
    });
  });
});
