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

describe('grants/programSpecialist', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by', async () => {
    const filters = { 'programSpecialist.ctn': 'Darcy' };
    const scope = await filtersToScopes(filters);
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(2);
    expect(found.map((f) => f.id)).toContain(recipients[2].id, recipients[5].id);
  });

  it('filters out', async () => {
    const filters = { 'programSpecialist.nctn': 'Darcy' };
    const scope = await filtersToScopes(filters);
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(4);
    const recips = found.map((f) => f.id);
    expect(recips).toContain(recipients[0].id);
    expect(recips).toContain(recipients[1].id);
    expect(recips).toContain(recipients[3].id);
    expect(recips).toContain(recipients[4].id);
  });
});
