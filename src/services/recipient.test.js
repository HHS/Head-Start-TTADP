import moment from 'moment';
import {
  Recipient, Grant, Program, sequelize,
} from '../models';
import { allRecipients, recipientById, recipientsByName } from './recipient';
import filtersToScopes from '../scopes';

describe('Recipient DB service', () => {
  const recipients = [
    {
      id: 73,
      name: 'recipient 1',
      recipientType: 'recipient type 1',
    },
    {
      id: 74,
      name: 'recipient 2',
      recipientType: 'recipient type 2',
    },
    {
      id: 75,
      name: 'recipient 3',
      recipientType: 'recipient type 3',
    },
    {
      id: 76,
      name: 'recipient 4',
      recipientType: 'recipient type 4',
    },
  ];

  beforeAll(async () => {
    await Promise.all(recipients.map((r) => Recipient.create(r)));
    await Promise.all([
      Grant.create({
        id: 74,
        number: '1145341',
        regionId: 1,
        recipientId: 74,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      }),
      Grant.create({
        id: 75,
        number: '1145543',
        regionId: 1,
        recipientId: 75,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
        grantSpecialistName: 'Tom Jones',
      }),
      Grant.create({
        id: 76,
        number: '3145351',
        regionId: 1,
        recipientId: 76,
        status: 'Active',
        startDate: new Date('2021-12-01'),
        endDate: new Date('2021-12-01'),
      }),
      Grant.create({
        id: 77,
        number: '3145352',
        regionId: 1,
        recipientId: 76,
        status: 'Active',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-15'),
      }),
      Grant.create({
        id: 78,
        number: '3145353',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date('2021-12-01'),
        endDate: new Date('2021-12-01'),
      }),
      Grant.create({
        id: 79,
        number: '3145354',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-15'),
      }),
      Grant.create({
        id: 80,
        number: '3145355',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date(moment().add(1, 'days').format('MM/DD/yyyy')),
        endDate: new Date(moment().add(2, 'days').format('MM/DD/yyyy')),
      }),
      Grant.create({
        id: 81,
        number: '3145399',
        regionId: 1,
        recipientId: 76,
        status: 'Inactive',
        startDate: new Date(moment().subtract(5, 'days').format('MM/DD/yyyy')),
        endDate: new Date(moment().format('MM/DD/yyyy')),
      }),

    ]);
    await Promise.all([
      Program.create({
        id: 74,
        grantId: 75,
        name: 'type2',
        programType: 'EHS',
        startYear: 'Aeons ago',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 75,
        grantId: 75,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 76,
        grantId: 76,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 77,
        grantId: 77,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 78,
        grantId: 78,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 79,
        grantId: 79,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 80,
        grantId: 80,
        name: 'type',
        programType: 'HS',
        startYear: 'The murky depths of time',
        status: 'active',
        startDate: 'today',
        endDate: 'tomorrow',
      }),
      Program.create({
        id: 81,
        grantId: 81,
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
    await Program.destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } });
    await Grant.destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } });
    await Recipient.destroy({ where: { id: [73, 74, 75, 76] } });
    await sequelize.close();
  });

  describe('allRecipients', () => {
    it('returns all recipients', async () => {
      const foundRecipients = await allRecipients();
      const foundIds = foundRecipients.map((g) => g.id);
      expect(foundIds).toContain(73);
      expect(foundIds).toContain(74);
      expect(foundIds).toContain(75);
    });
  });

  describe('recipientById', () => {
    it('returns a recipient by recipient id and region id', async () => {
      const query = { 'region.in': ['1'], 'recipientId.ctn': [75] };
      const { grant: grantScopes } = filtersToScopes(query);
      const recipient3 = await recipientById(75, grantScopes);

      // Recipient Name.
      expect(recipient3.name).toBe('recipient 3');

      // Recipient Type.
      expect(recipient3.recipientType).toBe('recipient type 3');

      // Number of Grants.
      expect(recipient3.grants.length).toBe(1);

      // Grants.
      expect(recipient3.grants[0].id).toBe(75);
      expect(recipient3.grants[0].regionId).toBe(1);
      expect(recipient3.grants[0].number).toBe('1145543');
      expect(recipient3.grants[0].status).toBe('Active');
      expect(recipient3.grants[0].programSpecialistName).toBe(null);
      expect(recipient3.grants[0].grantSpecialistName).toBe('Tom Jones');
      expect(recipient3.grants[0].startDate).toBeTruthy();
      expect(recipient3.grants[0].endDate).toBeTruthy();
      expect(recipient3.grants[0].programs.map((program) => program.name)).toStrictEqual(['type2', 'type']);
      expect(recipient3.grants[0].programs.map((program) => program.programType)).toStrictEqual(['EHS', 'HS']);
    });
    it('returns recipient and grants without a region specified', async () => {
      const query = { 'recipientId.ctn': [74] };
      const { grant: grantScopes } = filtersToScopes(query);
      const recipient2 = await recipientById(74, grantScopes);

      // Recipient Name.
      expect(recipient2.name).toBe('recipient 2');

      // Number of Grants.
      expect(recipient2.grants.length).toBe(1);

      // Grants.
      expect(recipient2.grants[0].id).toBe(74);
      expect(recipient2.grants[0].regionId).toBe(1);
      expect(recipient2.grants[0].number).toBe('1145341');
      expect(recipient2.grants[0].status).toBe('Active');
      expect(recipient2.grants[0].programSpecialistName).toBe(null);
      expect(recipient2.grants[0].grantSpecialistName).toBe(null);
      expect(recipient2.grants[0].startDate).toBeTruthy();
      expect(recipient2.grants[0].endDate).toBeTruthy();
    });

    it('returns null when nothing is found', async () => {
      const query = { 'recipientId.ctn': [100] };
      const { grant: grantScopes } = filtersToScopes(query);
      const recipient = await recipientById(100, grantScopes);

      expect(recipient).toBeNull();
    });

    it('returns active grants and inactive grants after cutoff', async () => {
      const query = { 'recipientId.ctn': [76] };
      const { grant: grantScopes } = filtersToScopes(query);
      const recipient = await recipientById(76, grantScopes);

      expect(recipient.name).toBe('recipient 4');
      expect(recipient.grants.length).toBe(4);

      // Active After Cut Off Date.
      expect(recipient.grants[0].id).toBe(76);
      expect(recipient.grants[0].status).toBe('Active');

      // Active Before Cut Off Date.
      expect(recipient.grants[1].id).toBe(77);
      expect(recipient.grants[1].status).toBe('Active');

      // Inactive with End Date of Today.
      expect(recipient.grants[2].id).toBe(81);
      expect(recipient.grants[2].status).toBe('Inactive');

      // Inactive After Cut Off Date.
      expect(recipient.grants[3].id).toBe(78);
      expect(recipient.grants[3].status).toBe('Inactive');
    });
  });

  describe('recipientsByName', () => {
    const recipientsToSearch = [
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
      {
        id: 67,
        name: 'Apple Butter',
      },
      {
        id: 68,
        name: 'Apple Crisp',
      },
      {
        id: 69,
        name: 'Pumpkin Pie',
      },
      {
        id: 70,
        name: 'Pumpkin Bread',
      },
      {
        id: 71,
        name: 'Pumpkin Coffee',
      },
    ];

    const grants = [
      {
        id: 50,
        recipientId: 63,
        regionId: 1,
        number: '12345',
        programSpecialistName: 'George',
        status: 'Active',
        endDate: new Date(2020, 10, 2),
        grantSpecialistName: 'Glen',
      },
      {
        id: 51,
        recipientId: 63,
        regionId: 1,
        number: '12346',
        programSpecialistName: 'Belle',
        status: 'Active',
        grantSpecialistName: 'Ben',
      },
      {
        id: 52,
        recipientId: 64,
        regionId: 1,
        number: '55557',
        programSpecialistName: 'Caesar',
        status: 'Active',
        grantSpecialistName: 'Cassie',
      },
      {
        id: 53,
        recipientId: 64,
        regionId: 1,
        number: '55558',
        programSpecialistName: 'Doris',
        status: 'Active',
        grantSpecialistName: 'David',
      },
      {
        id: 54,
        recipientId: 65,
        regionId: 1,
        number: '12349',
        programSpecialistName: 'Eugene',
        status: 'Active',
        grantSpecialistName: 'Eric',
      },
      {
        id: 55,
        recipientId: 65,
        regionId: 2,
        number: '12350',
        programSpecialistName: 'Farrah',
        status: 'Active',
        grantSpecialistName: 'Frank',
      },
      {
        id: 56,
        recipientId: 66,
        regionId: 1,
        number: '12351',
        programSpecialistName: 'Aaron',
        status: 'Active',
        grantSpecialistName: 'Brom',
      },
      {
        id: 57,
        recipientId: 67,
        regionId: 1,
        number: '12352',
        programSpecialistName: 'Jim',
        status: 'Inactive',
      },
      {
        id: 58,
        recipientId: 68,
        regionId: 1,
        number: '12353',
        programSpecialistName: 'Jim',
        status: 'Inactive',
        endDate: new Date(2020, 10, 31),
        grantSpecialistName: 'Allen',
      },

      {
        id: 59,
        recipientId: 69,
        regionId: 1,
        number: '582353',
        programSpecialistName: 'John Tom',
        status: 'Inactive',
        endDate: new Date(moment().add(2, 'days').format('MM/DD/yyyy')),
        grantSpecialistName: 'Bill Smith',
      },
      {
        id: 60,
        recipientId: 70,
        regionId: 1,
        number: '582354',
        programSpecialistName: 'John Tom',
        status: 'Inactive',
        endDate: new Date(moment().format('MM/DD/yyyy')),
        grantSpecialistName: 'Bill Smith',
      },
      {
        id: 61,
        recipientId: 71,
        regionId: 1,
        number: '582355',
        programSpecialistName: 'Grant West',
        status: 'Inactive',
        endDate: new Date('09/01/2020'),
        grantSpecialistName: 'Joe Allen',
      },
    ];

    function regionToScope(regionId) {
      const query = { 'region.in': [regionId] };
      const { grant } = filtersToScopes(query);
      return grant;
    }

    beforeAll(async () => {
      await Promise.all(recipientsToSearch.map((g) => Recipient.create(g)));
      await Promise.all(grants.map((g) => Grant.create(g)));
    });

    afterAll(async () => {
      await Grant.destroy({ where: { recipientId: recipientsToSearch.map((g) => g.id) } });
      await Recipient.destroy({ where: { id: recipientsToSearch.map((g) => g.id) } });
    });

    it('finds based on recipient name', async () => {
      const foundRecipients = await recipientsByName('apple', regionToScope(1), 'name', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(3);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(63);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(66);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(68);
    });

    it('finds based on recipient id', async () => {
      const foundRecipients = await recipientsByName('5555', regionToScope(1), 'name', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(1);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(64);
    });

    it('finds based on region', async () => {
      const foundRecipients = await recipientsByName('banana', regionToScope(2), 'name', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(1);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(65);
    });

    it('sorts based on name', async () => {
      const foundRecipients = await recipientsByName('apple', regionToScope(1), 'name', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(3);
      expect(foundRecipients.rows.map((g) => g.id)).toStrictEqual([68, 63, 66]);
    });

    it('sorts based on program specialist', async () => {
      const foundRecipients = await recipientsByName('apple', regionToScope(1), 'programSpecialist', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(3);
      expect(foundRecipients.rows.map((g) => g.id)).toStrictEqual([66, 63, 68]);
    });

    it('sorts based on grant specialist', async () => {
      const foundRecipients = await recipientsByName('apple', regionToScope(1), 'grantSpecialist', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(3);
      expect(foundRecipients.rows.map((g) => g.id)).toStrictEqual([68, 63, 66]);
    });

    it('respects sort order', async () => {
      const foundRecipients = await recipientsByName('apple', regionToScope(1), 'name', 'desc', 0);
      expect(foundRecipients.rows.length).toBe(3);
      expect(foundRecipients.rows.map((g) => g.id)).toStrictEqual([66, 63, 68]);
    });

    it('respects the offset passed in', async () => {
      const foundRecipients = await recipientsByName('apple', regionToScope(1), 'name', 'asc', 1);
      expect(foundRecipients.rows.length).toBe(2);
      expect(foundRecipients.rows.map((g) => g.id)).toStrictEqual([63, 66]);
    });

    it('finds inactive grants that fall in the accepted range', async () => {
      const foundRecipients = await recipientsByName('Pumpkin', regionToScope(1), 'name', 'asc', 0);
      expect(foundRecipients.rows.length).toBe(2);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(70);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(71);
    });
  });
});
