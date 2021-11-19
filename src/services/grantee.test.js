import {
  Grantee, Grant, Program, sequelize,
} from '../models';
import { allGrantees, granteeById, granteesByName } from './grantee';
import filtersToScopes from '../scopes';

describe('Grantee DB service', () => {
  const grantees = [
    {
      id: 73,
      name: 'grantee 1',
      granteeType: 'grantee type 1',
    },
    {
      id: 74,
      name: 'grantee 2',
      granteeType: 'grantee type 2',
    },
    {
      id: 75,
      name: 'grantee 3',
      granteeType: 'grantee type 3',
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
        startDate: new Date(),
        endDate: new Date(),
        grantSpecialistName: 'Tom Jones',
      }),
      await Grant.create({
        id: 74,
        number: '1145341',
        regionId: 1,
        granteeId: 74,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      }),
      await Program.create({
        id: 74,
        grantId: 75,
        name: 'type2',
        programType: 'EHS',
        startYear: 'Aeons ago',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      await Program.create({
        id: 75,
        grantId: 75,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
    ]);
  });

  afterAll(async () => {
    const id = grantees.map((g) => g.id);
    await Program.destroy({ where: { id } });
    await Grant.destroy({ where: { id } });
    await Grantee.destroy({ where: { id } });
    await sequelize.close();
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

  describe('granteeById', () => {
    it('returns a grantee by grantee id and region id', async () => {
      const query = { 'region.in': ['1'], 'granteeId.in': [75] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee3 = await granteeById(75, grantScopes);

      // Grantee Name.
      expect(grantee3.name).toBe('grantee 3');

      // Grantee Type.
      expect(grantee3.granteeType).toBe('grantee type 3');

      // Number of Grants.
      expect(grantee3.grants.length).toBe(1);

      // Grants.
      expect(grantee3.grants[0].id).toBe(75);
      expect(grantee3.grants[0].regionId).toBe(1);
      expect(grantee3.grants[0].number).toBe('1145543');
      expect(grantee3.grants[0].status).toBe('Active');
      expect(grantee3.grants[0].programSpecialistName).toBe(null);
      expect(grantee3.grants[0].grantSpecialistName).toBe('Tom Jones');
      expect(grantee3.grants[0].startDate).toBeTruthy();
      expect(grantee3.grants[0].endDate).toBeTruthy();
      expect(grantee3.grants[0].programs.map((program) => program.name)).toStrictEqual(['type2', 'type']);
      expect(grantee3.grants[0].programs.map((program) => program.programType)).toStrictEqual(['EHS', 'HS']);
    });
    it('returns grantee and grants without a region specified', async () => {
      const query = { 'granteeId.in': [74] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee2 = await granteeById(74, grantScopes);

      // Grantee Name.
      expect(grantee2.name).toBe('grantee 2');

      // Number of Grants.
      expect(grantee2.grants.length).toBe(1);

      // Grants.
      expect(grantee2.grants[0].id).toBe(74);
      expect(grantee2.grants[0].regionId).toBe(1);
      expect(grantee2.grants[0].number).toBe('1145341');
      expect(grantee2.grants[0].status).toBe('Active');
      expect(grantee2.grants[0].programSpecialistName).toBe(null);
      expect(grantee2.grants[0].grantSpecialistName).toBe(null);
      expect(grantee2.grants[0].startDate).toBeTruthy();
      expect(grantee2.grants[0].endDate).toBeTruthy();
    });

    it('returns null when nothing is found', async () => {
      const query = { 'granteeId.in': [100] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee = await granteeById(100, grantScopes);

      expect(grantee).toBeNull();
    });
  });

  describe('granteesByName', () => {
    const granteesToSearch = [
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
        grantSpecialistName: 'Glen',
      },
      {
        id: 51,
        granteeId: 63,
        regionId: 1,
        number: '12346',
        programSpecialistName: 'Belle',
        grantSpecialistName: 'Ben',
      },
      {
        id: 52,
        granteeId: 64,
        regionId: 1,
        number: '55557',
        programSpecialistName: 'Caesar',
        grantSpecialistName: 'Cassie',
      },
      {
        id: 53,
        granteeId: 64,
        regionId: 1,
        number: '55558',
        programSpecialistName: 'Doris',
        grantSpecialistName: 'David',
      },
      {
        id: 54,
        granteeId: 65,
        regionId: 1,
        number: '12349',
        programSpecialistName: 'Eugene',
        grantSpecialistName: 'Eric',
      },
      {
        id: 55,
        granteeId: 65,
        regionId: 2,
        number: '12350',
        programSpecialistName: 'Farrah',
        grantSpecialistName: 'Frank',
      },
      {
        id: 56,
        granteeId: 66,
        regionId: 1,
        number: '12351',
        programSpecialistName: 'Aaron',
        grantSpecialistName: 'Allen',
      },
    ];

    beforeEach(async () => {
      await Promise.all(granteesToSearch.map((g) => Grantee.create(g)));
      await Promise.all(grants.map((g) => Grant.create(g)));
    });

    afterEach(async () => {
      await Grant.destroy({ where: { granteeId: granteesToSearch.map((g) => g.id) } });
      await Grantee.destroy({ where: { id: granteesToSearch.map((g) => g.id) } });
    });

    it('finds based on grantee name', async () => {
      const foundGrantees = await granteesByName('apple', 1, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toContain(63);
    });

    it('finds based on grantee id', async () => {
      const foundGrantees = await granteesByName('5555', 1, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(1);
      expect(foundGrantees.rows.map((g) => g.id)).toContain(64);
    });

    it('finds based on region', async () => {
      const foundGrantees = await granteesByName('banana', 2, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(1);
      expect(foundGrantees.rows.map((g) => g.id)).toContain(65);
    });

    it('sorts based on name', async () => {
      const foundGrantees = await granteesByName('apple', 1, 'name', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([63, 66]);
    });

    it('sorts based on program specialist', async () => {
      const foundGrantees = await granteesByName('apple', 1, 'programSpecialist', 'asc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([66, 63]);
    });

    it('sorts based on grant specialist', async () => {
      const foundGrantees = await granteesByName('apple', 1, 'grantSpecialistName', 'desc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([63, 66]);
    });

    it('respects sort order', async () => {
      const foundGrantees = await granteesByName('apple', 1, 'name', 'desc', 0);
      expect(foundGrantees.rows.length).toBe(2);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([66, 63]);
    });

    it('respects the offset passed in', async () => {
      const foundGrantees = await granteesByName('apple', 1, 'name', 'asc', 1);
      expect(foundGrantees.rows.length).toBe(1);
      expect(foundGrantees.rows.map((g) => g.id)).toStrictEqual([66]);
    });
  });
});
