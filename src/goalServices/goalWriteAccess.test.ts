import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import canWriteGoals from './goalWriteAccess';

jest.mock('../models', () => ({ Grant: { findAll: jest.fn() } }));

const user = { permissions: [{ regionId: 1, scopeId: SCOPES.READ_WRITE_REPORTS }] };
const regionalGrant = { id: 10, regionId: 1, recipientId: 100 };
const otherGrant = { id: 20, regionId: 2, recipientId: 200 };

describe('canWriteGoals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.Grant.findAll.mockResolvedValue([regionalGrant, otherGrant]);
  });

  it('authorizes a grant using its stored region', async () => {
    await expect(
      canWriteGoals(user, [{ grantId: '10', regionId: '1', recipientId: '100' }])
    ).resolves.toBe(true);
  });

  it.each([
    [{ grantId: 20, regionId: 1 }],
    [{ grantId: 10, regionId: 2 }],
    [{ grantId: 10, recipientId: 200 }],
    [{ grantId: 10 }, { grantId: 20 }],
    [{ grantId: 999 }],
  ])('rejects unauthorized or mixed RTR targets: %j', async (...goals) => {
    await expect(canWriteGoals(user, goals)).resolves.toBe(false);
  });

  it('checks every activity-report grant against the report region', async () => {
    await expect(canWriteGoals(user, [{ grantIds: [10] }], 1)).resolves.toBe(true);
    await expect(canWriteGoals(user, [{ grantIds: [10, 20] }], 1)).resolves.toBe(false);
  });

  it('allows grouped report grants when all are in the same region', async () => {
    db.Grant.findAll.mockResolvedValue([regionalGrant, { id: 30, regionId: 1, recipientId: 200 }]);
    await expect(canWriteGoals(user, [{ grantIds: [10, 30], recipientId: 100 }], 1)).resolves.toBe(
      true
    );
  });

  it.each([null, {}, [null], [{ grantId: '10junk' }], [{ grantId: -1 }]])(
    'rejects malformed targets: %j',
    async (goals) => {
      await expect(canWriteGoals(user, goals)).resolves.toBe(false);
      expect(db.Grant.findAll).not.toHaveBeenCalled();
    }
  );

  it('permits an empty activity-report goal list', async () => {
    await expect(canWriteGoals(user, [], 1)).resolves.toBe(true);
    expect(db.Grant.findAll).not.toHaveBeenCalled();
  });

  it('accepts administrator and approver permissions', async () => {
    await expect(
      canWriteGoals({ permissions: [{ regionId: 1, scopeId: SCOPES.ADMIN }] }, [{ grantId: 10 }])
    ).resolves.toBe(true);
    await expect(
      canWriteGoals({ permissions: [{ regionId: 1, scopeId: SCOPES.APPROVE_REPORTS }] }, [
        { grantId: 10 },
      ])
    ).resolves.toBe(true);
  });

  it('rejects read-only permissions', async () => {
    await expect(
      canWriteGoals({ permissions: [{ regionId: 1, scopeId: SCOPES.READ_REPORTS }] }, [
        { grantId: 10 },
      ])
    ).resolves.toBe(false);
  });
});
