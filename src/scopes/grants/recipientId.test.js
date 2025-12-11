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

describe('grants/recipientId', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by single recipientId', async () => {
    const filters = { 'recipientId.in': [recipients[0].id] };
    const scope = await filtersToScopes(filters, 'grant');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBeGreaterThan(0);
    found.forEach((grant) => {
      expect(grant.recipientId).toBe(recipients[0].id);
    });
  });

  it('filters by multiple recipientIds', async () => {
    const recipientIds = [recipients[0].id, recipients[1].id];
    const filters = { 'recipientId.in': recipientIds };
    const scope = await filtersToScopes(filters, 'grant');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBeGreaterThan(0);
    found.forEach((grant) => {
      expect(recipientIds).toContain(grant.recipientId);
    });
  });

  it('excludes specific recipientIds using nin', async () => {
    const excludedRecipientIds = [recipients[0].id];
    const filters = { 'recipientId.nin': excludedRecipientIds };
    const scope = await filtersToScopes(filters, 'grant');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBeGreaterThan(0);
    found.forEach((grant) => {
      expect(excludedRecipientIds).not.toContain(grant.recipientId);
    });
  });

  it('excludes multiple recipientIds using nin', async () => {
    const excludedRecipientIds = [recipients[0].id, recipients[1].id];
    const filters = { 'recipientId.nin': excludedRecipientIds };
    const scope = await filtersToScopes(filters, 'grant');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBeGreaterThan(0);
    found.forEach((grant) => {
      expect(excludedRecipientIds).not.toContain(grant.recipientId);
    });
  });

  it('handles combination of recipientId and region filters', async () => {
    const filters = {
      'recipientId.in': [recipients[0].id],
      'region.in': [1],
    };
    const scope = await filtersToScopes(filters, 'grant');
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    found.forEach((grant) => {
      expect(grant.recipientId).toBe(recipients[0].id);
      expect(grant.regionId).toBe(1);
    });
  });
});
