import {
  Op,
  filtersToScopes,
  Grant,
  sequelize,
  recipients,
  possibleIds,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('grants/stateCode', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by', async () => {
    const filters = { 'stateCode.ctn': 'AZ' };
    const scope = await filtersToScopes(filters);
    const found = await Grant.findAll({
      attributes: ['id', 'stateCode'],
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(1);
    expect(found.map((f) => f.id)).toContain(recipients[0].id);
  });
});
