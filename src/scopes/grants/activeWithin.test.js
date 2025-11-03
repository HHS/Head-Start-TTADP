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

describe('grants/activeWithin', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('before', async () => {
    const filters = { 'startDate.bef': '2022/07/31' };
    const scope = await filtersToScopes(filters, { grant: { subset: true } });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(3);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([recipients[0].id, recipients[4].id, recipients[5].id]));
  });

  it('after', async () => {
    const filters = { 'startDate.aft': '2022/07/31' };
    const scope = await filtersToScopes(filters, { grant: { subset: true } });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(3);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id, recipients[3].id]));
  });

  it('after plus inactivation date', async () => {
    const filters = { 'startDate.aft': '2022/07/12' };
    const scope = await filtersToScopes(filters, { grant: { subset: true } });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });
    expect(found.length).toBe(5);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id, recipients[3].id,
        recipients[4].id, recipients[5].id]));
  });

  it('within', async () => {
    const filters = { 'startDate.win': '2022/07/31-2022/08/02' };
    const scope = await filtersToScopes(filters, { grant: { subset: true } });
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: possibleIds }],
      },
      include: scope.grant.include,
    });
    expect(found.length).toBe(2);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id]));
  });

  it('within plus inactivation date', async () => {
    const filters = { 'startDate.win': '2022/07/11-2022/07/28' };
    const scope = await filtersToScopes(filters, { grant: { subset: true } });
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.grant.where, { id: possibleIds }],
      },
      include: scope.grant.include,
    });
    expect(found.length).toBe(2);
    expect(found.map((f) => f.id))
      .toEqual(expect.arrayContaining([recipients[4].id, recipients[5].id]));
  });
});
