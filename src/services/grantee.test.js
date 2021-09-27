import db, { Grantee, Grant } from '../models';
import { allGrantees, granteesByNameAndRegion } from './grantee';

describe('Grantee DB service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('allGrantees', () => {
    const grantees = [
      {
        id: 60,
        name: 'grantee 1',
      },
      {
        id: 61,
        name: 'grantee 2',
      },
      {
        id: 62,
        name: 'grantee 3',
      },
    ];

    beforeEach(async () => {
      await Promise.all(grantees.map((g) => Grantee.create(g)));
    });

    afterEach(async () => {
      await Grantee.destroy({ where: { id: grantees.map((g) => g.id) } });
    });

    it('returns all grantees', async () => {
      const foundGrantees = await allGrantees();
      const foundIds = foundGrantees.map((g) => g.id);
      expect(foundIds).toContain(60);
      expect(foundIds).toContain(61);
      expect(foundIds).toContain(62);
    });
  });

  describe('granteesByNameAndRegion', () => {
    const grantees = [
      {
        id: 63,
        name: 'Apple Juice',
      },
      {
        id: 64,
        name: 'Orange',
      },
      {
        id: 65,
        name: 'Banana',
      },
      {
        id: 66,
        name: 'Apple Sauce',
      },
    ];

    const grants = [
      {
        id: 50,
        granteeId: 63,
        regionId: 1,
        number: '12345',
        programSpecialistName: 'George',
      },
      {
        id: 51,
        granteeId: 63,
        regionId: 1,
        number: '12346',
        programSpecialistName: 'Belle',
      },
      {
        id: 52,
        granteeId: 64,
        regionId: 1,
        number: '55557',
        programSpecialistName: 'Caesar',
      },
      {
        id: 53,
        granteeId: 64,
        regionId: 1,
        number: '55558',
        programSpecialistName: 'Doris',
      },
      {
        id: 54,
        granteeId: 65,
        regionId: 1,
        number: '12349',
        programSpecialistName: 'Eugene',
      },
      {
        id: 55,
        granteeId: 65,
        regionId: 2,
        number: '12350',
        programSpecialistName: 'Farrah',
      },
      {
        id: 56,
        granteeId: 66,
        regionId: 1,
        number: '12351',
        programSpecialistName: 'Aaron',
      },
    ];

    beforeEach(async () => {
      await Promise.all(grantees.map((g) => Grantee.create(g)));
      await Promise.all(grants.map((g) => Grant.create(g)));
    });

    afterEach(async () => {
      await Grant.destroy({ where: { granteeId: grantees.map((g) => g.id) } });
      await Grantee.destroy({ where: { id: grantees.map((g) => g.id) } });
    });

    it('finds based on grantee name', async () => {
      const foundGrantees = await granteesByNameAndRegion('apple', 1, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toContain(63);
    });

    it('finds based on grantee id', async () => {
      const foundGrantees = await granteesByNameAndRegion('5555', 1, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(1);
      expect(foundGrantees.rows.map((g) => g.id)).toContain(64);
    });

    it('finds based on region', async () => {
      const foundGrantees = await granteesByNameAndRegion('banana', 2, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(1);
      expect(foundGrantees.rows.map((g) => g.id)).toContain(65);
    });

    it('sorts based on name', async () => {
      const foundGrantees = await granteesByNameAndRegion('apple', 1, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([63, 66]);
    });

    it('sorts based on program specialist', async () => {
      const foundGrantees = await granteesByNameAndRegion('apple', 1, 'programSpecialist', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([66, 63]);
    });

    it('respects sort order', async () => {
      const foundGrantees = await granteesByNameAndRegion('apple', 1, 'name', 'desc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([66, 63]);
    });

    it('respects the offset passed in', async () => {
      const foundGrantees = await granteesByNameAndRegion('apple', 1, 'name', 'asc', 1);
      expect(foundGrantees.rows.length).toBe(1);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([66]);
    });
  });
});
