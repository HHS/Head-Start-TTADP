import {
  Op,
  filtersToScopes,
  Goal,
  sequelize,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('goals/region', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by region', async () => {
    const filters = { 'region.in': [sharedTestData.grant.regionId] };
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

    expect(found.length).toBe(6);
    expect(found.map((f) => f.name)).toContain('Goal 1');
  });

  it('filters out by region', async () => {
    const filters = { 'region.nin': [sharedTestData.grant.regionId] };
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
    expect(found[0].name).not.toContain('Goal 6');
  });
});
