import db, { Grantee, Grant } from '../models';
import { allGrantees, granteeByScopes } from './grantee';
import filtersToScopes from '../scopes';

describe('Grantee DB service', () => {
  const grantees = [
    {
      id: 73,
      name: 'grantee 1',
    },
    {
      id: 74,
      name: 'grantee 2',
    },
    {
      id: 75,
      name: 'grantee 3',
    },
  ];

  beforeAll(async () => {
    await Promise.all([
      ...grantees.map((g) => Grantee.create(g)),
      await Grant.create({
        id: 75,
        number: '1145543',
        regionId: 1,
        granteeId: 75,
        status: 'Active',
      }),
      await Grant.create({
        id: 74,
        number: '1145341',
        regionId: 1,
        granteeId: 74,
        status: 'Active',
      }),
    ]);
  });

  afterAll(async () => {
    await Grant.destroy({ where: { id: grantees.map((g) => g.id) } });
    await Grantee.destroy({ where: { id: grantees.map((g) => g.id) } });
    await db.sequelize.close();
  });

  describe('allGrantees', () => {
    it('returns all grantees', async () => {
      const foundGrantees = await allGrantees();
      const foundIds = foundGrantees.map((g) => g.id);
      expect(foundIds).toContain(73);
      expect(foundIds).toContain(74);
      expect(foundIds).toContain(75);
    });
  });

  describe('granteeByScopes', () => {
    it('returns a grantee by grantee id and region id', async () => {
      const query = { 'region.in': ['1'], 'granteeId.in': [75] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee3 = await granteeByScopes(75, grantScopes);

      // Grantee Name.
      expect(grantee3.name).toBe('grantee 3');

      // Number of Grants.
      expect(grantee3.grantsToReturn.length).toBe(1);

      // Grants.
      expect(grantee3.grantsToReturn[0].id).toBe(75);
      expect(grantee3.grantsToReturn[0].granteeId).toBe(75);
      expect(grantee3.grantsToReturn[0].regionId).toBe(1);
      expect(grantee3.grantsToReturn[0].number).toBe('1145543');
      expect(grantee3.grantsToReturn[0].status).toBe('Active');
      expect(grantee3.grantsToReturn[0].programSpecialistName).toBe(null);
      expect(grantee3.grantsToReturn[0].startDate).toBe(null);
      expect(grantee3.grantsToReturn[0].endDate).toBe(null);
    });
    it('returns grantee and grants without a region specified', async () => {
      const query = { 'granteeId.in': [75] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee2 = await granteeByScopes(74, grantScopes);

      // Grantee Name.
      expect(grantee2.name).toBe('grantee 2');

      // Number of Grants.
      expect(grantee2.grantsToReturn.length).toBe(1);

      // Grants.
      expect(grantee2.grantsToReturn[0].id).toBe(74);
      expect(grantee2.grantsToReturn[0].granteeId).toBe(74);
      expect(grantee2.grantsToReturn[0].regionId).toBe(1);
      expect(grantee2.grantsToReturn[0].number).toBe('1145341');
      expect(grantee2.grantsToReturn[0].status).toBe('Active');
      expect(grantee2.grantsToReturn[0].programSpecialistName).toBe(null);
      expect(grantee2.grantsToReturn[0].startDate).toBe(null);
      expect(grantee2.grantsToReturn[0].endDate).toBe(null);
    });
  });
});
