import db from '../models';
import { recipientsInRegion } from './communicationLog';

jest.mock('../models', () => ({
  Grant: { findAll: jest.fn() },
  sequelize: { col: jest.fn() },
}));

describe('communication log recipient regions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows all recipients with a grant in the requested region', async () => {
    db.Grant.findAll.mockResolvedValue([{ recipientId: 10 }, { recipientId: 20 }]);
    expect(await recipientsInRegion([10, 20], 1)).toBe(true);
    expect(db.Grant.findAll).toHaveBeenCalledWith({
      attributes: ['recipientId'],
      where: { recipientId: [10, 20], regionId: 1 },
    });
  });

  it.each([[20], [10, 20], [999]])(
    'rejects cross-region, mixed and nonexistent recipients: %j',
    async (...ids) => {
      db.Grant.findAll.mockResolvedValue([{ recipientId: 10 }]);
      expect(await recipientsInRegion(ids, 1)).toBe(false);
    }
  );

  it('allows recipients spanning regions when they have a grant in this region', async () => {
    db.Grant.findAll.mockResolvedValue([{ recipientId: 10 }, { recipientId: 10 }]);
    expect(await recipientsInRegion([10], 1)).toBe(true);
  });

  it('allows an empty recipient list', async () => {
    expect(await recipientsInRegion([], 1)).toBe(true);
    expect(db.Grant.findAll).not.toHaveBeenCalled();
  });

  it.each([Number.NaN, -1, 0, 1.1])('rejects invalid recipient IDs: %s', async (id) => {
    expect(await recipientsInRegion([id], 1)).toBe(false);
    expect(db.Grant.findAll).not.toHaveBeenCalled();
  });

  it('does not swallow lookup failures', async () => {
    db.Grant.findAll.mockRejectedValue(new Error('lookup failed'));
    await expect(recipientsInRegion([10], 1)).rejects.toThrow('lookup failed');
  });
});
