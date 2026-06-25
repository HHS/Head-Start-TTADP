import {
  createGoal,
  createGrant,
  filtersToScopes,
  Goal,
  Grant,
  Op,
  Recipient,
  sequelize,
  setupSharedTestData,
  sharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('goals/stateCode', () => {
  let txGrant;
  let txGoal;

  beforeAll(async () => {
    await setupSharedTestData();

    // Create a grant with a distinct stateCode and a goal linked to it.
    // The grants created by setupSharedTestData have no stateCode set,
    // so 'TX' will only match this grant.
    txGrant = await createGrant({ stateCode: 'TX' });
    txGoal = await createGoal({ grantId: txGrant.id, name: 'TX State Goal', status: 'In Progress' });
  });

  afterAll(async () => {
    await Goal.destroy({
      where: { id: txGoal.id },
      individualHooks: true,
      force: true,
    });

    await Grant.destroy({
      where: { id: txGrant.id },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: { id: txGrant.recipientId },
      individualHooks: true,
    });

    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters goals by state code', async () => {
    const allGoalIds = [...sharedTestData.possibleGoalIds, txGoal.id];
    const filters = { 'stateCode.in': ['TX'] };
    const { goal: scope } = await filtersToScopes(filters, 'goal');
    const found = await Goal.findAll({
      where: {
        [Op.and]: [scope, { id: allGoalIds }],
      },
    });

    expect(found.length).toBe(1);
    expect(found[0].name).toBe('TX State Goal');
  });

  it('filters goals by state code using contains', async () => {
    const allGoalIds = [...sharedTestData.possibleGoalIds, txGoal.id];
    const filters = { 'stateCode.ctn': ['TX'] };
    const { goal: scope } = await filtersToScopes(filters, 'goal');
    const found = await Goal.findAll({
      where: {
        [Op.and]: [scope, { id: allGoalIds }],
      },
    });

    expect(found.length).toBe(1);
    expect(found[0].name).toBe('TX State Goal');
  });

  it('filters out goals by state code', async () => {
    const allGoalIds = [...sharedTestData.possibleGoalIds, txGoal.id];
    const filters = { 'stateCode.nin': ['TX'] };
    const { goal: scope } = await filtersToScopes(filters, 'goal');
    const found = await Goal.findAll({
      where: {
        [Op.and]: [scope, { id: allGoalIds }],
      },
    });

    // All shared test goals are returned; the TX goal is excluded.
    expect(found.length).toBe(sharedTestData.possibleGoalIds.length);
    expect(found.map((g) => g.name)).not.toContain('TX State Goal');
  });
});
