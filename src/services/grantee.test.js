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
        name: 'Apple',
      },
      {
        id: 64,
        name: 'Orange',
      },
      {
        id: 65,
        name: 'Banana',
      },
    ];

    const grants = [
      {
        id: 50,
        granteeId: 63,
        regionId: 1,
        number: '12345',
      },
      {
        id: 51,
        granteeId: 63,
        regionId: 1,
        number: '12346',
      },
      {
        id: 52,
        granteeId: 64,
        regionId: 1,
        number: '55557',
      },
      {
        id: 53,
        granteeId: 64,
        regionId: 1,
        number: '55558',
      },
      {
        id: 54,
        granteeId: 65,
        regionId: 1,
        number: '12349',
      },
      {
        id: 55,
        granteeId: 65,
        regionId: 2,
        number: '12350',
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
      const foundGrantees = await granteesByNameAndRegion('apple', 1);
      expect(foundGrantees.length).toBe(1);
      expect(foundGrantees.map((g) => g.id)).toContain(63);
    });

    it('finds based on grantee id', async () => {
      const foundGrantees = await granteesByNameAndRegion('5555', 1);
      expect(foundGrantees.length).toBe(1);
      expect(foundGrantees.map((g) => g.id)).toContain(64);
    });

    it('finds based on region', async () => {
      const foundGrantees = await granteesByNameAndRegion('banana', 2);
      expect(foundGrantees.length).toBe(1);
      expect(foundGrantees.map((g) => g.id)).toContain(65);
    });
  });
});
