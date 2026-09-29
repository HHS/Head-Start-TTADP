import { EmptyResultError } from 'sequelize';
import createOrFindExisting from './createOrFindExisting';

describe('createOrFindExisting', () => {
  const transaction = { id: 'txn' } as never;
  const values = { url: 'https://example.test' };

  const makeModel = (create: jest.Mock) => ({ name: 'Thing', create }) as never;

  it('returns the inserted row, using ON CONFLICT DO NOTHING', async () => {
    const inserted = { id: 1 };
    const create = jest.fn().mockResolvedValue(inserted);
    const findExisting = jest.fn();

    await expect(
      createOrFindExisting(makeModel(create), values, findExisting, transaction)
    ).resolves.toEqual({ record: inserted, created: true });
    expect(create).toHaveBeenCalledWith(values, { transaction, ignoreDuplicates: true });
    expect(findExisting).not.toHaveBeenCalled();
  });

  it('returns the existing row when the insert was skipped by a conflict', async () => {
    const existing = { id: 2 };
    const create = jest.fn().mockRejectedValue(new EmptyResultError());
    const findExisting = jest.fn().mockResolvedValue(existing);

    await expect(
      createOrFindExisting(makeModel(create), values, findExisting, transaction)
    ).resolves.toEqual({ record: existing, created: false });
  });

  it('throws when the insert was skipped but no matching row exists', async () => {
    const create = jest.fn().mockRejectedValue(new EmptyResultError());
    const findExisting = jest.fn().mockResolvedValue(null);

    await expect(
      createOrFindExisting(makeModel(create), values, findExisting, transaction)
    ).rejects.toThrow('Thing: insert skipped by a conflicting unique constraint');
  });

  it('propagates any other error from the insert', async () => {
    const error = new Error('connection lost');
    const create = jest.fn().mockRejectedValue(error);
    const findExisting = jest.fn();

    await expect(
      createOrFindExisting(makeModel(create), values, findExisting, transaction)
    ).rejects.toThrow(error);
    expect(findExisting).not.toHaveBeenCalled();
  });
});
