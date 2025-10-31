import {
  Op,
  filtersToScopes,
  Grant,
  Recipient,
  sequelize,
  recipients,
  possibleIds,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('grants/programType', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by', async () => {
    const filters = { 'programType.in': ['EHS'] };
    const scope = await filtersToScopes(filters);
    const found = await Recipient.findAll({
      include: [
        {
          model: Grant,
          as: 'grants',
          where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
        },
      ],
    });
    expect(found.length).toBe(1);
    expect(found[0].id).toBe(recipients[0].id);
  });

  it('filters out', async () => {
    const filters = { 'programType.nin': ['EHS'] };
    const scope = await filtersToScopes(filters);
    const found = await Recipient.findAll({
      include: [
        {
          model: Grant,
          as: 'grants',
          where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
        },
      ],
    });
    expect(found.length).toBe(3);
    const recips = found.map((f) => f.id);
    expect(recips).toContain(recipients[3].id);
    expect(recips).toContain(recipients[2].id);
    expect(recips).toContain(recipients[1].id);
  });
});
