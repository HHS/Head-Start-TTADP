const mockFindAndCountAll = jest.fn();

jest.mock('../models', () => ({
  GrantDeliveredReview: {
    rawAttributes: {
      id: { type: { key: 'INTEGER' } },
      grantId: { type: { key: 'INTEGER' } },
      deliveredReviewId: { type: { key: 'INTEGER' } },
      recipient_name: { type: { key: 'TEXT' } },
      region_id: { type: { key: 'INTEGER' } },
    },
    findAndCountAll: mockFindAndCountAll,
  },
  sequelize: {
    where: jest.fn(),
    literal: jest.fn(),
    escape: jest.fn((value) => value),
  },
}));

describe('monitoringDiagnostics', () => {
  beforeEach(() => {
    jest.resetModules();
    mockFindAndCountAll.mockReset();
    mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  it('falls back safely when filter, range, or sort are malformed JSON', async () => {
    const { monitoringDiagnostics } = await import('./monitoringDiagnostics');

    await monitoringDiagnostics('grantDeliveredReviews', {
      filter: '{"recipient_name":"broken"value"}',
      range: '[bad json',
      sort: '[bad json',
    });

    expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
      order: [['id', 'ASC']],
      offset: 0,
      limit: 10,
    }));
  });
});
