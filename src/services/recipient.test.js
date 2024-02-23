import moment from 'moment';
import faker from '@faker-js/faker';
import crypto from 'crypto';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  Recipient,
  Grant,
  Program,
  Region,
  User,
  Objective,
  ObjectiveTopic,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Topic,
  ActivityReportGoal,
  Permission,
  ProgramPersonnel,
  sequelize,
  ActivityReportApprover,
  ActivityReportCollaborator,
} from '../models';
import {
  allRecipients,
  recipientById,
  recipientsByName,
  recipientsByUserId,
  getGoalsByActivityRecipient,
  recipientLeadership,
  allArUserIdsByRecipientAndRegion,
} from './recipient';
import filtersToScopes from '../scopes';
import SCOPES from '../middleware/scopeConstants';
import { GOAL_STATUS, OBJECTIVE_STATUS, AUTOMATIC_CREATION } from '../constants';
import { createReport, destroyReport } from '../testUtils';

describe('Recipient DB service', () => {
  const recipients = [
    {
      id: 73,
      uei: 'NNA5N2KHMGN2',
      name: 'recipient 1',
      recipientType: 'recipient type 1',
    },
    {
      id: 74,
      uei: 'NNA5N2KHMKN2',
      name: 'recipient 2',
      recipientType: 'recipient type 2',
    },
    {
      id: 75,
      uei: 'NNA5N2KHMJN2',
      name: 'recipient 3',
      recipientType: 'recipient type 3',
    },
    {
      id: 76,
      uei: 'NNA5N2KHMGM2',
      name: 'recipient 4',
      recipientType: 'recipient type 4',
    },
  ];

  beforeAll(async () => {
    await Program.destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } });
    await Grant.unscoped().destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } });
    await Recipient.unscoped().destroy({ where: { id: [73, 74, 75, 76] } });

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
    await Grant.unscoped().destroy({ where: { id: [74, 75, 76, 77, 78, 79, 80, 81] } });
    await Recipient.unscoped().destroy({ where: { id: [73, 74, 75, 76] } });
    await sequelize.close();
  });

  describe('allRecipients', () => {
    it('returns all recipients', async () => {
      const foundRecipients = await allRecipients();
      const foundIds = foundRecipients.map((g) => g.id);
      expect(foundIds).toContain(74);
      expect(foundIds).toContain(75);
      expect(foundIds).toContain(76);
    });
  });

  describe('recipientById', () => {
    it('returns a recipient by recipient id and region id', async () => {
      const query = { 'region.in': ['1'] };
      const { grant: grantScopes } = await filtersToScopes(query);
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
      expect(recipient3.grants[0].programs.map((program) => program.name).sort()).toStrictEqual(['type2', 'type'].sort());
      expect(recipient3.grants[0].programs.map((program) => program.programType).sort()).toStrictEqual(['EHS', 'HS'].sort());
    });
    it('returns recipient and grants without a region specified', async () => {
      const recipient2 = await recipientById(74, {});

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
      const recipient = await recipientById(100, {});

      expect(recipient).toBeNull();
    });

    it('returns active grants and inactive grants after cutoff', async () => {
      const recipient = await recipientById(76, {});

      expect(recipient.name).toBe('recipient 4');
      expect(recipient.grants.length).toBe(5);

      // Active After Cut Off Date.
      expect(recipient.grants[0].id).toBe(76);
      expect(recipient.grants[0].status).toBe('Active');

      // Active Before Cut Off Date.
      expect(recipient.grants[1].id).toBe(77);
      expect(recipient.grants[1].status).toBe('Active');

      // Inactive with End Date past Today.
      expect(recipient.grants[2].id).toBe(80);
      expect(recipient.grants[2].status).toBe('Inactive');

      // Inactive with End Date of Today.
      expect(recipient.grants[3].id).toBe(81);
      expect(recipient.grants[3].status).toBe('Inactive');

      // Inactive After Cut Off Date.
      expect(recipient.grants[4].id).toBe(78);
      expect(recipient.grants[4].status).toBe('Inactive');
    });
  });

  describe('recipientsByName', () => {
    const recipientsToSearch = [
      {
        id: 63,
        uei: 'NNA5N2KHMGN2',
        name: 'Apple Juice',
      },
      {
        id: 64,
        uei: 'NNA5N2KBAGN2',
        name: 'Orange',
      },
      {
        id: 65,
        uei: 'NNA5N2KHMBA2',
        name: 'Banana',
      },
      {
        id: 66,
        uei: 'NNA5N2KHMCA2',
        name: 'Apple Sauce',
      },
      {
        id: 67,
        uei: 'NNA5N2KHMGN2',
        name: 'Apple Butter',
      },
      {
        id: 68,
        uei: 'NNA5N2KHMGN2',
        name: 'Apple Crisp',
      },
      {
        id: 69,
        uei: 'NNA5N2KHMDZ2',
        name: 'Pumpkin Pie',
      },
      {
        id: 70,
        uei: 'NNA5N2KHMVF2',
        name: 'Pumpkin Bread',
      },
      {
        id: 71,
        uei: 'NNA5N2KHMPO2',
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
        annualFundingMonth: 'October',
      },
      {
        id: 51,
        recipientId: 63,
        regionId: 1,
        number: '12346',
        programSpecialistName: 'Belle',
        status: 'Active',
        grantSpecialistName: 'Ben',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 52,
        recipientId: 64,
        regionId: 1,
        number: '55557',
        programSpecialistName: 'Caesar',
        status: 'Active',
        grantSpecialistName: 'Cassie',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 53,
        recipientId: 64,
        regionId: 1,
        number: '55558',
        programSpecialistName: 'Doris',
        status: 'Active',
        grantSpecialistName: 'David',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 54,
        recipientId: 65,
        regionId: 1,
        number: '12349',
        programSpecialistName: 'Eugene',
        status: 'Active',
        grantSpecialistName: 'Eric',
        annualFundingMonth: 'January',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 55,
        recipientId: 65,
        regionId: 2,
        number: '12350',
        programSpecialistName: 'Farrah',
        status: 'Active',
        grantSpecialistName: 'Frank',
        annualFundingMonth: null,
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 56,
        recipientId: 66,
        regionId: 1,
        number: '12351',
        programSpecialistName: 'Aaron',
        status: 'Active',
        grantSpecialistName: 'Brom',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
      },
      {
        id: 57,
        recipientId: 67,
        regionId: 1,
        number: '12352',
        programSpecialistName: 'Jim',
        status: 'Inactive',
        annualFundingMonth: 'October',
        startDate: new Date(),
        endDate: new Date(),
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
        annualFundingMonth: 'November',
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
        annualFundingMonth: 'October',
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
        annualFundingMonth: 'October',
      },
      {
        id: 61,
        recipientId: 71,
        regionId: 1,
        number: '582355',
        programSpecialistName: 'Grant West',
        status: 'Inactive',
        endDate: new Date('08/31/2020'),
        grantSpecialistName: 'Joe Allen',
        annualFundingMonth: 'October',
      },
    ];

    async function regionToScope(regionId) {
      const query = { 'region.in': [regionId] };
      const { grant } = await filtersToScopes(query);
      return grant;
    }

    beforeAll(async () => {
      await Promise.all(recipientsToSearch.map((g) => Recipient.create(g)));
      await Promise.all(grants.map((g) => Grant.create(g)));
    });

    afterAll(async () => {
      await Grant.unscoped().destroy({
        where: { recipientId: recipientsToSearch.map((g) => g.id) },
      });
      await Recipient.unscoped().destroy({ where: { id: recipientsToSearch.map((g) => g.id) } });
    });

    it('returns only user regions', async () => {
      const foundRecipients = await recipientsByName('banana', {}, 'name', 'asc', 0, [2]);
      expect(foundRecipients.rows.length).toBe(1);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(65);
    });

    it('finds based on recipient name', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(4);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(63);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(66);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(68);
    });

    it('finds based on recipient id', async () => {
      const foundRecipients = await recipientsByName('5555', await regionToScope(1), 'name', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(1);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(64);
    });

    it('finds based on region', async () => {
      const foundRecipients = await recipientsByName('banana', await regionToScope(2), 'name', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(1);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(65);
    });

    it('sorts based on name', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(4);
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([67, 68, 63, 66].sort());
    });

    it('sorts based on program specialist', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'programSpecialist', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(4);
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([66, 63, 67, 68].sort());
    });

    it('sorts based on grant specialist', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'grantSpecialist', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(4);
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([67, 68, 63, 66].sort());
    });

    it('respects sort order', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'desc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(4);
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([66, 63, 67, 68].sort());
    });

    it('respects the offset passed in', async () => {
      const foundRecipients = await recipientsByName('apple', await regionToScope(1), 'name', 'asc', 1, [1, 2]);
      expect(foundRecipients.rows.length).toBe(3);
      expect(foundRecipients.rows.map((g) => g.id).sort()).toStrictEqual([63, 66, 68].sort());
    });

    it('finds inactive grants that fall in the accepted range', async () => {
      const foundRecipients = await recipientsByName('Pumpkin', await regionToScope(1), 'name', 'asc', 0, [1, 2]);
      expect(foundRecipients.rows.length).toBe(2);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(70);
      expect(foundRecipients.rows.map((g) => g.id)).toContain(69);
    });
  });

  describe('recipientsByUserId', () => {
    let region;
    let user;
    let firstRecipient;
    let secondRecipient;

    beforeAll(async () => {
      region = await Region.create({ name: 'Test Region 200', id: 200 });
      user = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      await Permission.create({
        userId: user.id,
        regionId: region.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      firstRecipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: 'Test Recipient 200',
      });

      secondRecipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: 'Test Recipient 201',
      });

      await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: firstRecipient.id,
        regionId: region.id,
        number: String(faker.datatype.number({ min: 1000 })),
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      });

      await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: secondRecipient.id,
        regionId: region.id,
        number: String(faker.datatype.number({ min: 1000 })),
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      });

      await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: secondRecipient.id,
        regionId: region.id,
        number: String(faker.datatype.number({ min: 1000 })),
        status: 'Inactive',
        startDate: new Date(),
        endDate: new Date(),
      });
    });

    afterAll(async () => {
      await Grant.destroy({
        where: { recipientId: [firstRecipient.id, secondRecipient.id] },
        individualHooks: true,
      });
      await Recipient.destroy({ where: { id: [firstRecipient.id, secondRecipient.id] } });
      await Permission.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
      await Region.destroy({ where: { id: region.id } });
    });

    it('finds grants for the user', async () => {
      const foundRecipients = await recipientsByUserId(user.id);
      expect(foundRecipients.length).toBe(2);
      expect(foundRecipients.map((g) => g.id)).toContain(firstRecipient.id);
      expect(foundRecipients.map((g) => g.id)).toContain(secondRecipient.id);

      const [first, second] = foundRecipients;
      expect(first.name).toBe(firstRecipient.name); // check that they are in the right order

      const grants = [...first.grants, ...second.grants];
      expect(grants.length).toBe(2);
    });

    it('returns an empty array if the user is not found', async () => {
      const foundRecipients = await recipientsByUserId(999999999);
      expect(foundRecipients.length).toBe(0);
    });
  });

  describe('de-duplicating on goal field responses', () => {
    let recipient;
    let goals;
    let grant;
    let template;

    const region = 5;

    beforeAll(async () => {
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        uei: faker.datatype.string(),
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
      });

      const goal = {
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
        status: GOAL_STATUS.IN_PROGRESS,
      };

      grant = await Grant.create({
        status: 'Active',
        regionId: region,
        id: faker.datatype.number({ min: 1000 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        startDate: '2019-01-01',
        endDate: '2024-01-01',
      });

      const secret = 'secret';
      const hash = crypto
        .createHmac('md5', secret)
        .update(goal.name)
        .digest('hex');

      template = await GoalTemplate.create({
        hash,
        templateName: goal.name,
        creationMethod: AUTOMATIC_CREATION,
      });

      const fieldPrompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        title: 'why do anything?',
        prompt: 'why do anything?',
        ordinal: 1,
        hint: '',
        caution: '',
        fieldType: 'multiselect',
        required: {},
        options: [
          'gotta',
          'dont have to',
          'not sure',
          'too tired to answer',
        ],
      });

      const goal1 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
      });

      const goal2 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
      });

      const goal3 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
      });

      const goal4 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
      });

      goals = [goal1, goal2, goal3, goal4];

      await GoalFieldResponse.create({
        goalId: goal1.id,
        goalTemplateFieldPromptId: fieldPrompt.id,
        response: ['gotta'],
        onAr: true,
        onApprovedAR: false,
      });

      await GoalFieldResponse.create({
        goalId: goal2.id,
        goalTemplateFieldPromptId: fieldPrompt.id,
        response: ['not sure', 'dont have to'],
        onAr: true,
        onApprovedAR: false,
      });

      await GoalFieldResponse.create({
        goalId: goal3.id,
        goalTemplateFieldPromptId: fieldPrompt.id,
        response: ['not sure', 'dont have to'],
        onAr: true,
        onApprovedAR: false,
      });
    });

    afterAll(async () => {
      await GoalFieldResponse.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });

      await GoalTemplateFieldPrompt.destroy({
        where: {
          goalTemplateId: template.id,
        },
        individualHooks: true,
        force: true,
      });

      await GoalTemplate.destroy({
        where: {
          id: template.id,
        },
        individualHooks: true,
        force: true,
      });

      await Grant.destroy({
        where: {
          id: goals.map((g) => g.grantId),
        },
        individualHooks: true,
      });
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
        individualHooks: true,
      });
    });

    it('properly de-duplicates based on responses', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(recipient.id, region, {});
      expect(goalRows.length).toBe(3);

      const doubler = goalRows.find((r) => r.responsesForComparison === 'not sure,dont have to');
      expect(doubler).toBeTruthy();

      expect(doubler.ids.length).toBe(2);

      const singler = goalRows.find((r) => r.responsesForComparison === 'gotta');
      expect(singler).toBeTruthy();
      expect(singler.ids.length).toBe(1);

      const noResponse = goalRows.find((r) => r.responsesForComparison === '');
      expect(noResponse).toBeTruthy();
      expect(noResponse.ids.length).toBe(1);
    });
  });

  describe('reduceObjectivesForRecipientRecord', () => {
    let recipient;
    let goals;
    let objectives;
    let topics;
    let report;

    beforeAll(async () => {
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        uei: faker.datatype.string(),
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
      });

      const goal = {
        name: `${faker.animal.dog()} ${faker.animal.cat()} ${faker.animal.dog()}`,
      };

      const grant = await Grant.create({
        status: 'Active',
        regionId: 5,
        id: faker.datatype.number({ min: 1000 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        startDate: '2019-01-01',
        endDate: '2024-01-01',
      });

      const goal1 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
      });

      const goal2 = await Goal.create({
        name: goal.name,
        status: goal.status,
        grantId: grant.id,
        onApprovedAR: true,
        source: null,
      });

      goals = [goal1, goal2];

      const matchingObjectiveTitle = 'This is a test objective for reduction';

      const objective1 = await Objective.create({
        goalId: goal1.id,
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        title: matchingObjectiveTitle,
        supportType: 'Planning',
      });

      const objective2 = await Objective.create({
        goalId: goal1.id,
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        title: matchingObjectiveTitle,
        supportType: 'Planning',
      });

      const objective3 = await Objective.create({
        goalId: goal2.id,
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        title: matchingObjectiveTitle,
        supportType: 'Planning',
      });

      objectives = [objective1, objective2, objective3];

      topics = await Topic.bulkCreate([
        { name: `${faker.company.bsNoun()} ${faker.company.bsNoun()}` },
        { name: `${faker.company.bsNoun()} ${faker.company.bsNoun()}` },
        { name: `${faker.company.bsNoun()} ${faker.company.bsNoun()}` },
        { name: `${faker.company.bsNoun()} ${faker.company.bsNoun()}` },
      ]);

      await ObjectiveTopic.bulkCreate(
        objectives.map((o, i) => ({ objectiveId: o.id, topicId: topics[i + 1].id })),
      );

      const reason = faker.animal.cetacean();

      report = await createReport({
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
        reason: [reason],
        calculatedStatus: REPORT_STATUSES.APPROVED,
        topics: [topics[0].name],
        regionId: 5,
      });

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal1.id,
      });

      const aro = await ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: objective1.id,
        supportType: 'Planning',
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro.id,
        topicId: topics[1].id,
      });
    });

    afterAll(async () => {
      await ActivityReportObjectiveTopic.destroy({
        where: {
          topicId: topics.map((t) => t.id),
        },
        individualHooks: true,
      });
      await ActivityReportObjective.destroy({
        where: {
          objectiveId: objectives.map((o) => o.id),
        },
      });
      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      });
      await destroyReport(report);
      await ObjectiveTopic.destroy({
        where: {
          objectiveId: objectives.map((o) => o.id),
        },
        individualHooks: true,
      });

      await Topic.destroy({
        where: {
          id: topics.map((t) => t.id),
        },
        individualHooks: true,
      });
      await Objective.destroy({
        where: {
          id: objectives.map((o) => o.id),
        },
        individualHooks: true,
        force: true,
      });
      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });
      await Grant.destroy({
        where: {
          id: goals.map((g) => g.grantId),
        },
        individualHooks: true,
      });
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
        individualHooks: true,
      });
    });

    it('successfully reduces data without losing topics', async () => {
      const goalsForRecord = await getGoalsByActivityRecipient(recipient.id, 5, {});

      expect(goalsForRecord.count).toBe(1);
      expect(goalsForRecord.goalRows.length).toBe(1);
      expect(goalsForRecord.allGoalIds.length).toBe(2);

      const goal = goalsForRecord.goalRows[0];
      expect(goal.reasons.length).toBe(1);

      expect(goal.objectives.length).toBe(1);
      const objective = goal.objectives[0];
      expect(objective.topics.length).toBe(4);
      expect(objective.topics.sort()).toEqual(topics.map((t) => t.name).sort());
      expect(objective.supportType).toBe('Planning');
      expect(objective.activityReports.length).toBe(1);
    });
  });

  describe('recipientLeadership', () => {
    const createProgramPersonnel = async (
      grantId,
      programId,
      role = 'director',
      active = true,
      programType = 'HS',
    ) => {
      const personnel = await ProgramPersonnel.create({
        grantId,
        programId,
        role,
        title: '',
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        suffix: faker.name.suffix(),
        prefix: faker.name.prefix(),
        active,
        effectiveDate: active ? new Date() : new Date('2020/01/01'),
        mapsTo: null,
        email: faker.internet.email(),
      });

      // no way to return associations on create
      // https://github.com/sequelize/sequelize/discussions/15186

      return ProgramPersonnel.findByPk(personnel.id, {
        include: [
          {
            model: Grant,
            as: 'grant',
          },
          {
            model: Program,
            as: 'program',
          },
        ],
      });
    };

    const REGION_ID = 10;

    const recipient = {
      name: faker.datatype.string({ min: 10 }),
      id: faker.datatype.number({ min: 10000 }),
      uei: faker.datatype.string({ min: 10 }),
    };
    const grant = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    };

    const grant2 = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    };

    const irrelevantGrant = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID + 1,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    };

    const dummyProgram = {
      grantId: grant.id,
      startYear: '2023',
      startDate: '2023/01/01',
      endDate: '2023/12/31',
      status: 'Active',
      name: `${faker.animal.type() + faker.company.companyName()} Program`,
      programType: 'HS',
    };

    let activePersonnel;

    beforeAll(async () => {
      await db.Recipient.create(recipient);
      await db.Grant.create(grant);
      await db.Grant.create(grant2);
      await db.Grant.create(irrelevantGrant);

      const program1 = await db.Program.create({
        ...dummyProgram,
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      });

      const program2 = await db.Program.create({
        ...dummyProgram,
        grantId: grant2.id,
        programType: 'EHS',
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      });

      const irrelevantProgram = await db.Program.create({
        ...dummyProgram,
        grantId: irrelevantGrant.id,
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      });

      // Program personnel to ignore
      // because it's on a different grant
      await createProgramPersonnel(irrelevantGrant.id, irrelevantProgram.id, 'director', true, 'HS');

      // Program personnel to ignore
      // because it's inactive
      await createProgramPersonnel(grant.id, program1.id, 'director', false, 'HS');

      // program personnel to retrieve
      activePersonnel = await Promise.all([
        createProgramPersonnel(grant.id, program1.id, 'director', true, 'HS'),
        createProgramPersonnel(grant2.id, program2.id, 'director', true, 'EHS'),
        createProgramPersonnel(grant.id, program1.id, 'cfo', true, 'HS'),
        createProgramPersonnel(grant2.id, program2.id, 'cfo', true, 'EHS'),
      ]);
    });
    afterAll(async () => {
      await db.ProgramPersonnel.destroy({
        where: {
          grantId: [grant.id, grant2.id, irrelevantGrant.id],
        },
      });

      await db.Program.destroy({
        where: {
          grantId: [grant.id, grant2.id, irrelevantGrant.id],
        },
      });

      await db.Grant.destroy({
        where: {
          id: [grant.id, grant2.id, irrelevantGrant.id],
        },
        individualHooks: true,
      });

      await db.Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('retrieves the correct program personnel', async () => {
      const leadership = await recipientLeadership(recipient.id, REGION_ID);

      expect(leadership.length).toBe(4);

      activePersonnel.sort((a, b) => a.nameAndRole.localeCompare(b.nameAndRole));

      const expectedNamesAndTitles = activePersonnel.map((p) => ({
        fullName: `${p.firstName} ${p.lastName}`,
        fullRole: p.fullRole,
      }));

      leadership.sort((a, b) => a.nameAndRole.localeCompare(b.nameAndRole));

      leadership.forEach((p, i) => {
        expect(p.fullName).toBe(expectedNamesAndTitles[i].fullName);
        expect(p.fullRole).toBe(expectedNamesAndTitles[i].fullRole);
      });
    });
  });

  describe('allArUserIdsByRecipientAndRegion', () => {
    let author;
    let collaboratorOne;
    let collaboratorTwo;
    let approverOne;
    let approverTwo;
    let dummyUser;

    let recipient;
    let grant;
    let report;

    beforeAll(async () => {
      author = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      collaboratorOne = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      collaboratorTwo = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      approverOne = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      approverTwo = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      dummyUser = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 1000 }),
        name: faker.datatype.string(),
        uei: faker.datatype.string(),
      });

      grant = await Grant.create({
        id: faker.datatype.number({ min: 1000 }),
        recipientId: recipient.id,
        regionId: 1,
        number: faker.datatype.string(),
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      });

      report = await createReport({
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
        reason: ['test'],
        calculatedStatus: REPORT_STATUSES.APPROVED,
        regionId: 1,
        userId: author.id,
      });

      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: collaboratorOne.id,
      });

      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: collaboratorTwo.id,
      });

      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: approverOne.id,
      });

      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: approverTwo.id,
      });
    });

    afterAll(async () => {
      await ActivityReportApprover.destroy({
        where: {
          userId: [approverOne.id, approverTwo.id],
        },
      });

      await ActivityReportCollaborator.destroy({
        where: {
          userId: [collaboratorOne.id, collaboratorTwo.id],
        },
      });

      await destroyReport(report);
      await Grant.destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
      });

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });

      await User.destroy({
        where: {
          id: [
            author.id,
            collaboratorOne.id,
            collaboratorTwo.id,
            approverOne.id,
            approverTwo.id,
            dummyUser.id,
          ],
        },
      });
    });

    it('returns all user ids for a recipient and region', async () => {
      const userIds = await allArUserIdsByRecipientAndRegion(recipient.id, 1);
      expect(userIds.length).toBe(5);
      expect(userIds).toContain(author.id);
      expect(userIds).toContain(collaboratorOne.id);
      expect(userIds).toContain(collaboratorTwo.id);
      expect(userIds).toContain(approverOne.id);
      expect(userIds).toContain(approverTwo.id);
    });
  });
});
