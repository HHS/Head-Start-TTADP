import { GOAL_STATUS } from '../constants';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { recipientsInRegion } from '../services/communicationLog';
import { createRecipient, createRegion, getUniqueId } from '../testUtils';
import { goalRegionsById } from './goals';
import canWriteGoals from './goalWriteAccess';

const { Goal, Grant, Recipient, Region, sequelize } = db;

describe('resource region authorization database queries', () => {
  let regions;
  let recipients;
  let grants;
  let goals;
  let user;

  beforeAll(async () => {
    regions = await Promise.all([createRegion({}), createRegion({})]);
    recipients = await Promise.all([createRecipient({}), createRecipient({})]);
    grants = await Promise.all([
      Grant.create(
        {
          id: getUniqueId(),
          number: `auth-${getUniqueId()}`,
          regionId: regions[0].id,
          recipientId: recipients[0].id,
        },
        { hooks: false }
      ),
      Grant.create(
        {
          id: getUniqueId(),
          number: `auth-${getUniqueId()}`,
          regionId: regions[1].id,
          recipientId: recipients[1].id,
        },
        { hooks: false }
      ),
    ]);
    goals = await Promise.all(
      grants.map((grant) =>
        Goal.create(
          {
            name: 'Region authorization regression',
            grantId: grant.id,
            status: GOAL_STATUS.NOT_STARTED,
            isFromSmartsheetTtaPlan: false,
          },
          { hooks: false }
        )
      )
    );
    user = { permissions: [{ regionId: regions[0].id, scopeId: SCOPES.READ_WRITE_REPORTS }] };
  });

  afterAll(async () => {
    try {
      if (goals)
        await Goal.destroy({
          where: { id: goals.map((goal) => goal.id) },
          force: true,
          hooks: false,
        });
      if (grants)
        await Grant.destroy({ where: { id: grants.map((grant) => grant.id) }, hooks: false });
      if (recipients)
        await Recipient.destroy({
          where: { id: recipients.map((recipient) => recipient.id) },
          hooks: false,
        });
      if (regions)
        await Region.destroy({ where: { id: regions.map((region) => region.id) }, hooks: false });
    } finally {
      await sequelize.close();
    }
  });

  it('resolves every real goal region through its grant', async () => {
    expect(await goalRegionsById([goals[0].id])).toEqual([regions[0].id]);
    expect((await goalRegionsById(goals.map((goal) => goal.id))).sort()).toEqual(
      regions.map((region) => region.id).sort()
    );
  });

  it('includes soft-deleted goal regions when authorizing stored responses', async () => {
    await goals[1].destroy({ hooks: false });
    try {
      expect((await goalRegionsById(goals.map((goal) => goal.id))).sort()).toEqual(
        regions.map((region) => region.id).sort()
      );
    } finally {
      await goals[1].restore({ hooks: false });
    }
  });

  it('authorizes RTR writes against stored grants even with forged region metadata', async () => {
    expect(await canWriteGoals(user, [{ grantId: grants[0].id, regionId: regions[0].id }])).toBe(
      true
    );
    expect(await canWriteGoals(user, [{ grantId: grants[1].id, regionId: regions[0].id }])).toBe(
      false
    );
    expect(
      await canWriteGoals(
        user,
        grants.map((grant) => ({ grantId: grant.id }))
      )
    ).toBe(false);
  });

  it('binds every report goal grant to the report region', async () => {
    expect(await canWriteGoals(user, [{ grantIds: [grants[0].id] }], regions[0].id)).toBe(true);
    expect(
      await canWriteGoals(user, [{ grantIds: grants.map((grant) => grant.id) }], regions[0].id)
    ).toBe(false);
  });

  it('rejects cross-region and mixed communication-log recipients', async () => {
    expect(await recipientsInRegion([recipients[0].id], regions[0].id)).toBe(true);
    expect(await recipientsInRegion([recipients[1].id], regions[0].id)).toBe(false);
    expect(
      await recipientsInRegion(
        recipients.map((recipient) => recipient.id),
        regions[0].id
      )
    ).toBe(false);
  });
});
