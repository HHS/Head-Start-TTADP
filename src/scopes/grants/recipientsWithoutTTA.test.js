import {
  Op,
  filtersToScopes,
  Grant,
  sequelize,
  recipients,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('grants/recipientsWithoutTTA', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('within plus inactivation date', async () => {
    const filters = { 'recipientsWithoutTTA.win': '2022/03/01-2022/03/31' };
    const scope = await filtersToScopes(filters);
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: sharedTestData.grants.map((g) => g.id) }],
      },
    });
    expect(found.length).toBe(2);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([recipients[0].id, recipients[3].id]));
  });
});
