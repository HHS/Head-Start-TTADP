import {
  Op,
  filtersToScopes,
  Goal,
  sequelize,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('goals/createDate', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('before', async () => {
    const filters = { 'createDate.bef': '2021/01/09' };
    const { goal: scope } = await filtersToScopes(filters);
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

    expect(found.length).toBe(4);
    expect(found.map((g) => g.name)).toContain('Goal 1');
    expect(found.map((g) => g.name)).toContain('Goal 2');
    expect(found.map((g) => g.name)).toContain('Goal 3');
    expect(found.map((g) => g.name)).toContain('Goal 4');
  });

  it('after', async () => {
    const filters = { 'createDate.aft': '2021/01/09' };
    const { goal: scope } = await filtersToScopes(filters);
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

    expect(found.length).toBe(3);
    expect(found.map((g) => g.name)).toContain('Goal 5');
  });

  it('within', async () => {
    const filters = { 'createDate.win': '2021/01/09-2021/01/11' };
    const { goal: scope } = await filtersToScopes(filters);
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
    expect(found.map((g) => g.name)).toContain('Goal 5');
  });
});
