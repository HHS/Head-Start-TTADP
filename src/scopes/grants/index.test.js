import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import filtersToScopes from '../index';
import {
  Recipient,
  Grant,
  Goal,
  ActivityReport,
  Program,
  User,
  Group,
  GroupGrant,
  ActivityRecipient,
  sequelize,
  GroupCollaborator,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
} from '../../models';
import {
  createGrant,
} from '../../testUtils';

const draftReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  regionId: 1,
  version: 1,
};

const recipientOneName = 'Gibson, Hammes and Schuster - White-Beaked Dolphin - 98464';
const recipientTwoName = 'Flatley, Kling and Olson - Longman\'s Beaked Whale - 6796';
const recipientThreeName = 'Kris, Hoeger and Ward - Southern Bottlenose Whale - 9393';
const recipientFourName = 'Grant LLC - Irrawaddy Dolphin - 39678';

const seed = 45997;
const recipients = [
  {
    id: seed,
    name: recipientOneName,
  },
  {
    id: seed + 1,
    name: recipientTwoName,
  },
  {
    id: seed + 2,
    name: recipientThreeName,
  },
  {
    id: seed + 3,
    name: recipientFourName,
  },
  {
    id: seed + 4,
    name: recipientThreeName,
  },
  {
    id: seed + 5,
    name: recipientFourName,
  },
];

const possibleIds = recipients.map((recipient) => recipient.id);

describe('grant filtersToScopes', () => {
  let mockUser;
  let mockUserTwo;
  let group;
  const groupName = 'Hickle - Graham - Southern Bottlenose Whale - 96089';
  let publicGroup;
  const publicGroupName = 'Gulgowski and Sons - Australian Snubfin Dolphin - 9916';
  const specialGrantNumber = '29971';
  let grantGroupOne;
  let grantGroupTwo;
  let grants;
  let activityReports;
  let activityRecipients;
  let programs;

  beforeAll(async () => {
    mockUser = await User.create({
      id: seed + 6,
      homeRegionId: 1,
      hsesUsername: '|2$t)rb5=83',
      hsesUserId: 'U;!?-X>FzF4',
      lastLogin: new Date(),
    });

    mockUserTwo = await User.create({
      id: seed + 7,
      homeRegionId: 1,
      hsesUsername: 'Qk$B!O0VxW6',
      hsesUserId: '%d)""y`lRU8',
      lastLogin: new Date(),
    });

    await Promise.all(recipients.map((g) => Recipient.create(g)));
    grants = await Promise.all([
      Grant.create({
        id: recipients[3].id,
        number: `${seed + 8}`,
        regionId: 4,
        recipientId: recipients[3].id,
        status: 'Active',
        startDate: new Date('08/03/2022'),
        endDate: new Date('08/03/2022'),
        programSpecialistName: 'No',
        stateCode: 'RI',
      }),
      Grant.create({
        id: recipients[0].id,
        number: specialGrantNumber,
        regionId: 1,
        recipientId: recipients[0].id,
        status: 'Active',
        startDate: new Date('07/01/2022'),
        endDate: new Date('07/01/2022'),
        programSpecialistName: 'No',
        stateCode: 'AZ',
      }),
      Grant.create({
        id: recipients[1].id,
        number: `${seed + 9}`,
        regionId: 1,
        recipientId: recipients[1].id,
        status: 'Active',
        startDate: new Date('08/01/2022'),
        endDate: new Date('08/01/2025'),
        programSpecialistName: 'Joe Bob',
        stateCode: 'AR',
      }),
      Grant.create({
        id: recipients[2].id,
        number: `${seed + 10}`,
        regionId: 3,
        recipientId: recipients[2].id,
        status: 'Active',
        startDate: new Date('08/01/2022'),
        endDate: new Date('08/01/2025'),
        programSpecialistName: 'Darcy',
        stateCode: 'AK',
      }),
      Grant.create({
        id: recipients[4].id,
        number: `${seed + 11}`,
        regionId: 1,
        recipientId: recipients[1].id,
        status: 'Inactive',
        startDate: new Date('07/01/2022'),
        endDate: new Date('08/01/2025'),
        programSpecialistName: 'Joe Bob',
        stateCode: 'AR',
        inactivationDate: new Date('07/26/2022'),
      }),
      Grant.create({
        id: recipients[5].id,
        number: `${seed + 12}`,
        regionId: 3,
        recipientId: recipients[2].id,
        status: 'Inactive',
        startDate: new Date('07/01/2022'),
        endDate: new Date('08/01/2025'),
        programSpecialistName: 'Darcy',
        stateCode: 'AK',
        inactivationDate: new Date('07/26/2022'),
      }),
      // Use same recipient as above (both should be excluded).
      Grant.create({
        // Set id to a known value to ensure it is not used.
        id: seed + 13,
        number: `${seed + 14}`,
        regionId: 1,
        recipientId: recipients[1].id,
        status: 'Active',
        startDate: new Date('08/03/2022'),
        endDate: new Date('08/03/2022'),
        programSpecialistName: 'Joe Bob',
        stateCode: 'AR',
      }),
    ]);

    // Create Activity Reports.
    activityReports = await Promise.all([
      // Before range.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('01/01/2022'),
        endDate: new Date('01/15/2022'),
      }),
      // After range.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('04/01/2022'),
        endDate: new Date('05/20/2022'),
      }),
      // Within range.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('03/02/2022'),
        endDate: new Date('03/15/2022'),
      }),
      // Within range starts before ends after.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('01/01/2022'),
        endDate: new Date('04/02/2022'),
      }),
      // Within range starts on last day of range.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('03/31/2022'),
        endDate: new Date('05/20/2022'),
      }),
      // Within range ends on first day of range.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('02/01/2022'),
        endDate: new Date('03/01/2022'),
      }),
      // Report outside of range, but grant is used by another activity report that is in range.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('01/01/2021'),
        endDate: new Date('03/01/2021'),
      }),
      // Just outside of range by one day. Not included in results for recipientsWithoutTTA.
      ActivityReport.create({
        ...draftReport,
        userId: mockUser.id,
        startDate: new Date('04/01/2022'),
        endDate: new Date('04/02/2022'),
      }),
    ]);

    // Create Activity Report Goals.
    activityRecipients = await Promise.all([
      ActivityRecipient.create({
        activityReportId: activityReports[0].id,
        grantId: grants[0].id,
      }),
      ActivityRecipient.create({
        activityReportId: activityReports[1].id,
        grantId: grants[1].id,
      }),
      ActivityRecipient.create({
        activityReportId: activityReports[2].id,
        grantId: grants[2].id,
      }),
      ActivityRecipient.create({
        activityReportId: activityReports[3].id,
        grantId: grants[3].id,
      }),
      ActivityRecipient.create({
        activityReportId: activityReports[4].id,
        grantId: grants[4].id,
      }),
      ActivityRecipient.create({
        activityReportId: activityReports[5].id,
        grantId: grants[5].id,
      }),
      ActivityRecipient.create({
        activityReportId: activityReports[6].id,
        grantId: grants[6].id,
      }),
    ]);

    programs = await Promise.all([
      Program.create({
        id: recipients[0].id,
        grantId: recipients[0].id,
        startYear: 'no',
        startDate: new Date('01/01/2023'),
        endDate: new Date('01/01/2026'),
        status: 'Active',
        programType: 'EHS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      Program.create({
        id: recipients[1].id,
        grantId: recipients[1].id,
        startYear: 'no',
        startDate: new Date('01/01/2023'),
        endDate: new Date('01/01/2025'),
        status: 'Active',
        programType: 'HS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      Program.create({
        id: recipients[2].id,
        grantId: recipients[2].id,
        startYear: 'no',
        startDate: new Date('01/01/2023'),
        endDate: new Date('01/01/2025'),
        status: 'Active',
        programType: 'HS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    group = await Group.create({
      name: groupName,
      isPublic: false,
    });

    await GroupCollaborator.create({
      userId: mockUser.id,
      groupId: group.id,
      collaboratorTypeId: 1,
    });

    publicGroup = await Group.create({
      name: publicGroupName,
      isPublic: true,
    });

    await GroupCollaborator.create({
      userId: mockUserTwo.id,
      groupId: publicGroup.id,
      collaboratorTypeId: 1,
    });

    grantGroupOne = await GroupGrant.create({
      groupId: group.id,
      grantId: grants[0].id,
    });

    grantGroupTwo = await GroupGrant.create({
      groupId: group.id,
      grantId: grants[1].id,
    });

    await GroupGrant.create({
      groupId: publicGroup.id,
      grantId: grants[0].id,
    });

    await GroupGrant.create({
      groupId: publicGroup.id,
      grantId: grants[1].id,
    });
  });

  afterAll(async () => {
    await GroupGrant.destroy({
      where: {
        [Op.or]: [
          {
            groupId: group.id,
            grantId: grants[0].id,
          },
          {
            groupId: group.id,
            grantId: grants[1].id,
          },
          {
            groupId: publicGroup.id,
            grantId: grants[0].id,
          },
          {
            groupId: publicGroup.id,
            grantId: grants[1].id,
          },
        ],
      },
    });
    await GroupCollaborator.destroy({
      where: {
        [Op.or]: [
          {
            userId: mockUserTwo.id,
            groupId: publicGroup.id,
            collaboratorTypeId: 1,
          },
          {
            userId: mockUser.id,
            groupId: group.id,
            collaboratorTypeId: 1,
          },
        ],
      },
    });
    await Group.destroy({
      where: {
        [Op.or]: [
          {
            name: groupName,
            isPublic: false,
          },
          {
            name: publicGroupName,
            isPublic: true,
          },
        ],
      },
    });
    await Program.destroy({
      where: {
        id: programs.map((p) => p.id),
      },
    });
    await ActivityRecipient.destroy({
      where: {
        id: activityRecipients.map((ar) => ar.id),
      },
    });

    await ActivityReport.destroy({
      where: {
        id: activityReports.map((ar) => ar.id),
      },
    });

    await GoalFieldResponse.destroy({ where: {}, force: true });
    await Goal.destroy({ where: {}, force: true });

    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: possibleIds,
      },
    });

    await User.destroy({
      where: {
        id: [mockUser.id, mockUserTwo.id],
      },
    });

    await sequelize.close();
  });

  describe('activeWithin', () => {
    it('before', async () => {
      const filters = { 'startDate.bef': '2022/07/31' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[0].id], recipients[4].id, recipients[5].id));
    });

    it('after', async () => {
      const filters = { 'startDate.aft': '2022/07/31' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id, recipients[3].id]));
    });

    it('after plus inactivation date', async () => {
      const filters = { 'startDate.aft': '2022/07/12' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(5);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id, recipients[3].id,
          recipients[4].id, recipients[5].id]));
    });

    it('within', async () => {
      const filters = { 'startDate.win': '2022/07/31-2022/08/02' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: possibleIds }],
        },
        include: scope.grant.include,
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id]));
    });

    it('within plus inactivation date', async () => {
      const filters = { 'startDate.win': '2022/07/11-2022/07/28' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: possibleIds }],
        },
        include: scope.grant.include,
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[4].id, recipients[5].id]));
    });
  });

  describe('recipientsWithoutTTA', () => {
    it('within plus inactivation date', async () => {
      const filters = { 'recipientsWithoutTTA.win': '2022/03/01-2022/03/31' };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grants.map((g) => g.id) }],
        },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[0].id, recipients[3].id]));
    });
  });

  describe('region', () => {
    it('filters by region', async () => {
      const filters = { 'region.in': [3] };
      const scope = await filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[2].id], recipients[5].id));
    });
  });
  describe('recipientName', () => {
    it('filters by', async () => {
      const filters = { 'recipient.ctn': recipientTwoName };
      const scope = await filtersToScopes(filters);
      const found = await Recipient.findAll({
        include: [
          {
            model: Grant,
            as: 'grants',
            where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
          },
        ],
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[1].id);
    });
    it('filters out', async () => {
      const filters = { 'recipient.nctn': recipientTwoName };
      const scope = await filtersToScopes(filters);
      const found = await Recipient.findAll({
        include: [
          {
            model: Grant,
            as: 'grants',
            where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
          },
        ],
      });
      expect(found.length).toBe(3);
      const recips = found.map((f) => f.id);
      expect(recips).toContain(recipients[0].id);
      expect(recips).toContain(recipients[2].id);
      expect(recips).toContain(recipients[3].id);
    });
  });

  describe('programSpecialist', () => {
    it('filters by', async () => {
      const filters = { 'programSpecialist.ctn': 'Darcy' };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toContain(recipients[2].id, recipients[5].id);
    });
    it('filters out', async () => {
      const filters = { 'programSpecialist.nctn': 'Darcy' };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(4);
      const recips = found.map((f) => f.id);
      expect(recips).toContain(recipients[0].id);
      expect(recips).toContain(recipients[1].id);
      expect(recips).toContain(recipients[3].id);
      expect(recips).toContain(recipients[4].id);
    });
  });
  describe('programType', () => {
    it('filters by', async () => {
      const filters = { 'programType.in': ['EHS'] };
      const scope = await filtersToScopes(filters);
      const found = await Recipient.findAll({
        include: [
          {
            model: Grant,
            as: 'grants',
            where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
          },
        ],
      });
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(recipients[0].id);
    });
    it('filters out', async () => {
      const filters = { 'programType.nin': ['EHS'] };
      const scope = await filtersToScopes(filters);
      const found = await Recipient.findAll({
        include: [
          {
            model: Grant,
            as: 'grants',
            where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
          },
        ],
      });
      expect(found.length).toBe(3);
      const recips = found.map((f) => f.id);
      expect(recips).toContain(recipients[3].id);
      expect(recips).toContain(recipients[2].id);
      expect(recips).toContain(recipients[1].id);
    });
  });
  describe('grantNumber', () => {
    it('filters by', async () => {
      const filters = { 'grantNumber.ctn': specialGrantNumber };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[0].id);
    });
    it('filters out', async () => {
      const filters = { 'grantNumber.nctn': specialGrantNumber };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(5);
      const recips = found.map((f) => f.id);
      expect(recips).toContain(recipients[3].id);
      expect(recips).toContain(recipients[2].id);
      expect(recips).toContain(recipients[1].id);
      expect(recips).toContain(recipients[4].id);
      expect(recips).toContain(recipients[5].id);
    });
  });
  describe('stateCode', () => {
    it('filters by', async () => {
      const filters = { 'stateCode.ctn': 'AZ' };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        attributes: ['id', 'stateCode'],
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[0].id);
    });
  });

  describe('group', () => {
    it('filters by', async () => {
      const expectedGrants = [grantGroupOne.grantId, grantGroupTwo.grantId].sort();
      const filters = { 'group.in': [String(group.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      const foundGrants = found.map((f) => f.id).sort();
      expect(foundGrants).toEqual(expectedGrants);
    });

    it('filters by public group', async () => {
      const expectedGrants = [grantGroupOne.grantId, grantGroupTwo.grantId].sort();
      const filters = { 'group.in': [String(publicGroup.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      const foundGrants = found.map((f) => f.id).sort();
      expect(foundGrants).toEqual(expectedGrants);
    });

    it('filters out', async () => {
      const expectedGrants = [grantGroupOne.grantId, grantGroupTwo.grantId].sort();
      const filters = { 'group.nin': [String(group.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
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
      const expectedGrants = [grantGroupOne.grantId, grantGroupTwo.grantId].sort();
      const filters = { 'group.nin': [String(publicGroup.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
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
      const filters = { 'group.in': ['abc', '1; DROP TABLE users', String(group.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });

      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant.where, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id)).toContain(grantGroupOne.grantId);
      expect(found.map((f) => f.id)).toContain(grantGroupTwo.grantId);
      expect(found.length).toBe(2);
    });
  });

  describe('goalResponse', () => {
    let prompt;
    let goal1;
    let goal2;
    let goal3;
    let response1;
    let response2;
    let response3;

    beforeAll(async () => {
      prompt = await GoalTemplateFieldPrompt.findOne({
        where: { title: 'FEI root cause' },
      });

      goal1 = await Goal.create({
        name: 'Goal 6',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        createdAt: new Date('2021-01-20'),
        grantId: grants[1].id,
        createdVia: 'rtr',
      });

      goal2 = await Goal.create({
        name: 'Goal 7',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        createdAt: new Date('2021-01-20'),
        grantId: grants[2].id,
        createdVia: 'rtr',
      });

      goal3 = await Goal.create({
        name: 'Goal 8',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        createdAt: new Date('2021-01-20'),
        grantId: grants[3].id,
        createdVia: 'rtr',
      });

      response1 = await GoalFieldResponse.create({
        goalId: goal1.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['Community Partnerships'],
      });

      response2 = await GoalFieldResponse.create({
        goalId: goal2.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['Workforce', 'Family circumstances'],
      });

      response2 = await GoalFieldResponse.create({
        goalId: goal3.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['Facilities'],
      });
    });

    afterAll(async () => {
      const idsToDelete = [response1?.id, response2?.id, response3?.id].filter(Boolean);

      if (idsToDelete.length > 0) {
        await GoalFieldResponse.destroy({ where: { id: idsToDelete } });
      }

      await Goal.destroy({
        where: {
          id: [goal1.id, goal2.id, goal3.id],
        },
        individualHooks: true,
      });
    });

    it('finds goals with responses', async () => {
      const filters = { 'goalResponse.in': ['Workforce'] };
      const { grant: scope } = await filtersToScopes(filters, 'goal');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.where, { id: [grants[1].id, grants[2].id, grants[3].id] }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([grants[2].id]));
    });

    it('finds goals without responses', async () => {
      const filters = { 'goalResponse.nin': ['Workforce'] };
      const { grant: scope } = await filtersToScopes(filters, 'goal');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.where, { id: [grants[1].id, grants[2].id, grants[3].id] }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([grants[1].id, grants[3].id]));
    });

    it('prevents SQL injection via goalResponse.in parameter', async () => {
      const injectedInput = ['Workforce', "' OR 1=1 --"];

      const filters = { 'goalResponse.in': injectedInput };
      const { grant: scope } = await filtersToScopes(filters, 'goal');

      const found = await Grant.findAll({
        where: { [Op.and]: [scope.where, { id: [grants[1].id, grants[2].id, grants[3].id] }] },
      });

      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([grants[2].id]));
    });
  });

  describe('grantStatus', () => {
    let activeCdiGrant;
    let inactiveCdiGrant;
    let activeNonCdiGrant;
    let inactiveNonCdiGrant;

    let grantIds;

    beforeAll(async () => {
      // Create the grants.
      activeCdiGrant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: true,
      });

      inactiveCdiGrant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Inactive',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: true,
      });

      activeNonCdiGrant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: false,
      });

      inactiveNonCdiGrant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Inactive',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: false,
      });

      grantIds = [
        activeCdiGrant.id,
        inactiveCdiGrant.id,
        activeNonCdiGrant.id,
        inactiveNonCdiGrant.id];
    });

    afterAll(async () => {
      // Clean up grants.
      await Grant.destroy({
        where: {
          id: grantIds,
        },
        individualHooks: true,
      });

      // Clean up recipients.
      await Recipient.destroy({
        where: {
          id: [
            activeCdiGrant.recipientId,
            inactiveCdiGrant.recipientId,
            activeNonCdiGrant.recipientId,
            inactiveNonCdiGrant.recipientId,
          ],
        },
      });
    });

    it('filters by active grants', async () => {
      const filters = { 'grantStatus.in': ['active'] };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grantIds }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(activeNonCdiGrant.id)).toBe(true);
    });

    it('filters by not active grants', async () => {
      const filters = { 'grantStatus.nin': ['active'] };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grantIds }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(inactiveNonCdiGrant.id)).toBe(true);
    });

    it('filters by inactive grants', async () => {
      const filters = { 'grantStatus.in': ['inactive'] };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grantIds }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(inactiveNonCdiGrant.id)).toBe(true);
    });

    it('filters by not inactive grants', async () => {
      const filters = { 'grantStatus.nin': ['inactive'] };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grantIds }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(activeNonCdiGrant.id)).toBe(true);
    });

    it('filters by cdi grants', async () => {
      const filters = { 'grantStatus.in': ['cdi'] };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grantIds }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(activeCdiGrant.id)).toBe(true);
    });

    it('filters by not cdi grants', async () => {
      const filters = { 'grantStatus.nin': ['cdi'] };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant.where, { id: grantIds }],
        },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id).includes(activeNonCdiGrant.id)).toBe(true);
      expect(found.map((f) => f.id).includes(inactiveNonCdiGrant.id)).toBe(true);
    });
  });
});
