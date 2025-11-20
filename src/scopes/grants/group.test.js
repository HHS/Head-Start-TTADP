/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  Grant,
  sequelize,
  possibleIds,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('grants/group', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
    await sequelize.close();
  });

  it('filters by', async () => {
    const expectedGrants = [sharedTestData.grantGroupOne.grantId, sharedTestData.grantGroupTwo.grantId].sort();
    const filters = { 'group.in': [String(sharedTestData.group.id)] };
    const scope = await filtersToScopes(filters, { userId: sharedTestData.mockUser.id });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBe(2);
    const foundGrants = found.map((f) => f.id).sort();
    expect(foundGrants).toEqual(expectedGrants);
  });

  it('filters by public group', async () => {
    const expectedGrants = [sharedTestData.grantGroupOne.grantId, sharedTestData.grantGroupTwo.grantId].sort();
    const filters = { 'group.in': [String(sharedTestData.publicGroup.id)] };
    const scope = await filtersToScopes(filters, { userId: sharedTestData.mockUser.id });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBe(2);
    const foundGrants = found.map((f) => f.id).sort();
    expect(foundGrants).toEqual(expectedGrants);
  });

  it('filters out', async () => {
    const expectedGrants = [sharedTestData.grantGroupOne.grantId, sharedTestData.grantGroupTwo.grantId].sort();
    const filters = { 'group.nin': [String(sharedTestData.group.id)] };
    const scope = await filtersToScopes(filters, { userId: sharedTestData.mockUser.id });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBe(4);
    const foundGrants = found.map((f) => f.id).sort();
    expectedGrants.forEach((grant) => {
      expect(foundGrants).not.toContain(grant);
    });
  });

  it('filters out by public group', async () => {
    const expectedGrants = [sharedTestData.grantGroupOne.grantId, sharedTestData.grantGroupTwo.grantId].sort();
    const filters = { 'group.nin': [String(sharedTestData.publicGroup.id)] };
    const scope = await filtersToScopes(filters, { userId: sharedTestData.mockUser.id });
    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.length).toBe(4);
    const foundGrants = found.map((f) => f.id).sort();
    expectedGrants.forEach((grant) => {
      expect(foundGrants).not.toContain(grant);
    });
  });

  it('ignores invalid group.in IDs', async () => {
    const filters = { 'group.in': ['abc', '1; DROP TABLE users', String(sharedTestData.group.id)] };
    const scope = await filtersToScopes(filters, { userId: sharedTestData.mockUser.id });

    const found = await Grant.findAll({
      where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
    });

    expect(found.map((f) => f.id)).toContain(sharedTestData.grantGroupOne.grantId);
    expect(found.map((f) => f.id)).toContain(sharedTestData.grantGroupTwo.grantId);
    expect(found.length).toBe(2);
  });
});
