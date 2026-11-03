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

  it('allows a grant in the user region and resolves numeric strings', async () => {
    expect(await canWriteGoals(user, [{ grantId: '10', recipientId: '100', regionId: '1' }])).toBe(
      true
    );
    expect(db.Grant.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'regionId', 'recipientId'],
      where: { id: [10] },
    });
  });

  it.each([
    [{ grantId: 20, regionId: 1 }],
    [{ grantId: 20, regionId: 2 }],
    [{ grantId: 10, regionId: 2 }],
    [{ grantId: 10, recipientId: 200 }],
    [{ grantId: 10 }, { grantId: 20 }],
    [{ grantId: 999 }],
  ])(
    'rejects unauthorized grants, mixed batches and mismatched resource metadata: %j',
    async (...goals) => {
      expect(await canWriteGoals(user, goals)).toBe(false);
      expect(db.Grant.findAll).toHaveBeenCalledTimes(1);
    }
  );

  it.each(
    [null, {}, [null], [{ grantId: '10junk' }], [{ grantId: -1 }], [{ grantId: {} }]].map(
      (goals) => ({ goals })
    )
  )('rejects malformed targets: %j', async ({ goals }) => {
    expect(await canWriteGoals(user, goals)).toBe(false);
    expect(db.Grant.findAll).not.toHaveBeenCalled();
  });

  it('checks every report goal grant before allowing a batch', async () => {
    expect(await canWriteGoals(user, [{ grantIds: [10] }], 1)).toBe(true);
    expect(await canWriteGoals(user, [{ grantIds: [10, 20] }], 1)).toBe(false);
  });

  it('allows report goals grouped across recipients in the same region', async () => {
    db.Grant.findAll.mockResolvedValue([regionalGrant, { id: 30, regionId: 1, recipientId: 200 }]);
    expect(
      await canWriteGoals(user, [{ grantIds: [10, 30], recipientId: 100, regionId: 1 }], 1)
    ).toBe(true);
  });

  it('rejects report grant mismatch even if the user can write both regions', async () => {
    const multiRegionUser = {
      permissions: [1, 2].map((regionId) => ({ regionId, scopeId: SCOPES.READ_WRITE_REPORTS })),
    };
    expect(await canWriteGoals(multiRegionUser, [{ grantIds: [20] }], 1)).toBe(false);
  });

  it('rejects malformed report grant lists', async () => {
    expect(await canWriteGoals(user, [{ grantIds: '10' }], 1)).toBe(false);
    expect(await canWriteGoals(user, [{ grantIds: ['invalid'] }], 1)).toBe(false);
    expect(db.Grant.findAll).not.toHaveBeenCalled();
  });

  it('preserves clearing report goals and ignores goals without grants', async () => {
    expect(await canWriteGoals(user, [], 1)).toBe(true);
    expect(await canWriteGoals(user, [{}], 1)).toBe(true);
    expect(db.Grant.findAll).not.toHaveBeenCalled();
  });

  it('preserves approver and admin access to grants', async () => {
    for (const scopeId of [SCOPES.APPROVE_REPORTS, SCOPES.ADMIN]) {
      expect(
        await canWriteGoals({ permissions: [{ scopeId, regionId: 1 }] }, [{ grantId: 10 }])
      ).toBe(true);
    }
  });

  it('rejects read-only users', async () => {
    expect(
      await canWriteGoals({ permissions: [{ scopeId: SCOPES.READ_REPORTS, regionId: 1 }] }, [
        { grantId: 10 },
      ])
    ).toBe(false);
  });

  it('does not swallow lookup failures', async () => {
    db.Grant.findAll.mockRejectedValue(new Error('lookup failed'));
    await expect(canWriteGoals(user, [{ grantId: 10 }])).rejects.toThrow('lookup failed');
  });
});
