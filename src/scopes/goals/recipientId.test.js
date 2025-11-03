import {
  Op,
  filtersToScopes,
  Goal,
  sequelize,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('goals/recipientId', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by recipientId', async () => {
    const filters = { 'recipientId.ctn': [sharedTestData.grant.recipientId] };
    const { goal: scope } = await filtersToScopes(filters, 'goal');
    const found = await Goal.findAll({
      where: {
        [Op.and]: [
          scope,
          {
            id: sharedTestData.possibleGoalIds,
          },
        ],
      },
    });

    expect(found.length).toBe(1);
    expect(found[0].name).toContain('Goal 6');
  });
});
