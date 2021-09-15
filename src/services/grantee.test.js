import db, { Grantee, Grant } from '../models';
import { allGrantees, granteeByIdAndRegion } from './grantee';

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

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await Grantee.destroy({ where: { id: grantees.map((g) => g.id) } });
    await Grant.destroy({ where: { id: grantees.map((g) => g.id) } });
    db.sequelize.close();
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

  describe('granteeByIdAndRegion', () => {
    it('returns a grantee by grantee id and region id', async () => {
      const grantee3 = await granteeByIdAndRegion(65, 1);
      expect(grantee3).toStrictEqual({
        'grants.endDate': null,
        'grants.granteeId': 65,
        'grants.id': 65,
        'grants.number': '1145543',
        'grants.programSpecialistName': null,
        'grants.regionId': 1,
        'grants.startDate': null,
        name: 'grantee 3',
      });
    });
    it('returns grantee and grants without a region specified', async () => {
      const grantee2 = await granteeByIdAndRegion(64);
      expect(grantee2).toStrictEqual({
        'grants.endDate': null,
        'grants.granteeId': 64,
        'grants.id': 64,
        'grants.number': '1145341',
        'grants.programSpecialistName': null,
        'grants.regionId': 1,
        'grants.startDate': null,
        name: 'grantee 2',
      });
    });
  });
});
