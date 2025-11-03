import {
  Op,
  filtersToScopes,
  Grant,
  sequelize,
  recipients,
  possibleIds,
  specialGrantNumber,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('grants/grantNumber', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by', async () => {
    const filters = { 'grantNumber.ctn': specialGrantNumber };
    const scope = await filtersToScopes(filters);
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(1);
    expect(found.map((f) => f.id)).toContain(recipients[0].id);
  });

  it('filters out', async () => {
    const filters = { 'grantNumber.nctn': specialGrantNumber };
    const scope = await filtersToScopes(filters);
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(5);
    const recips = found.map((f) => f.id);
    expect(recips).toContain(recipients[3].id);
    expect(recips).toContain(recipients[2].id);
    expect(recips).toContain(recipients[1].id);
    expect(recips).toContain(recipients[4].id);
    expect(recips).toContain(recipients[5].id);
  });
});
