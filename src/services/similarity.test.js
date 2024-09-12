const { similarGoalsForRecipient } = require('./similarity');

const MOCK_DATA = [
  {
    goal1: {
      id: 1, name: 'Identify strategies', grantId: 1,
    },
    goal2: {
      id: 2, name: 'Identify strategies', grantId: 1,
    },
    similarity: 0.921823748234,
  },
];

describe('similarity service tests', () => {
  beforeAll(() => {
    global.oldfetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve(MOCK_DATA),
    }));
  });

  afterAll(() => {
    global.fetch = global.oldfetch;
  });

  it('works', async () => {
    const result = await similarGoalsForRecipient(1, true);
    expect(result).toEqual(MOCK_DATA);
    expect(fetch).toHaveBeenCalledWith(
      process.env.SIMILARITY_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.SIMILARITY_API_KEY,
        },
        body: JSON.stringify({
          recipient_id: 1,
          cluster: true,
          alpha: 0.9,
        }),
      },
    );
  });

  it('throws when fetch fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('fetch failed')));
    await expect(similarGoalsForRecipient(1, true)).rejects.toThrow('fetch failed');
  });
});
