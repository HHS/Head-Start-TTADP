import db, { Grantee, Grant } from '../models';
import { allGrantees, granteeByScopes } from './grantee';
import determineFiltersToScopes from '../scopes';

describe('Grantee DB service', () => {
  const grantees = [
    {
      id: 63,
      name: 'grantee 1',
    },
    {
      id: 64,
      name: 'grantee 2',
    },
    {
      id: 65,
      name: 'grantee 3',
    },
  ];

  beforeAll(async () => {
    await Promise.all([
      ...grantees.map((g) => Grantee.create(g)),
      await Grant.create({
        id: 65,
        number: '1145543',
        regionId: 1,
        granteeId: 65,
        status: 'Active',
      }),
      await Grant.create({
        id: 64,
        number: '1145341',
        regionId: 1,
        granteeId: 64,
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
      expect(foundIds).toContain(63);
      expect(foundIds).toContain(64);
      expect(foundIds).toContain(65);
    });
  });

  describe('granteeByScopes', () => {
    it('returns a grantee by grantee id and region id', async () => {
      const query = { 'region.in': ['1'], 'granteeId.in': [65] };
      const grantScopes = determineFiltersToScopes(query, 'grant');
      const grantee3 = await granteeByScopes(65, grantScopes);

      // Grantee Name.
      expect(grantee3.name).toBe('grantee 3');

      // Number of Grants.
      expect(grantee3.grantsToReturn.length).toBe(1);

      // Grants.
      expect(grantee3.grantsToReturn[0].id).toBe(65);
      expect(grantee3.grantsToReturn[0].granteeId).toBe(65);
      expect(grantee3.grantsToReturn[0].regionId).toBe(1);
      expect(grantee3.grantsToReturn[0].number).toBe('1145543');
      expect(grantee3.grantsToReturn[0].status).toBe('Active');
      expect(grantee3.grantsToReturn[0].programSpecialistName).toBe(null);
      expect(grantee3.grantsToReturn[0].startDate).toBe(null);
      expect(grantee3.grantsToReturn[0].endDate).toBe(null);
    });
    it('returns grantee and grants without a region specified', async () => {
      const query = { 'granteeId.in': [65] };
      const grantScopes = determineFiltersToScopes(query, 'grant');
      const grantee2 = await granteeByScopes(64, grantScopes);

      // Grantee Name.
      expect(grantee2.name).toBe('grantee 2');

      // Number of Grants.
      expect(grantee2.grantsToReturn.length).toBe(1);

      // Grants.
      expect(grantee2.grantsToReturn[0].id).toBe(64);
      expect(grantee2.grantsToReturn[0].granteeId).toBe(64);
      expect(grantee2.grantsToReturn[0].regionId).toBe(1);
      expect(grantee2.grantsToReturn[0].number).toBe('1145341');
      expect(grantee2.grantsToReturn[0].status).toBe('Active');
      expect(grantee2.grantsToReturn[0].programSpecialistName).toBe(null);
      expect(grantee2.grantsToReturn[0].startDate).toBe(null);
      expect(grantee2.grantsToReturn[0].endDate).toBe(null);
    });
  });
});
