import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import filtersToScopes from '../index';
import {
  Recipient,
  Grant,
  ActivityReport,
  Program,
  User,
  Group,
  GroupGrant,
  ActivityRecipient,
  sequelize,
} from '../../models';

const draftReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  regionId: 1,
  version: 1,
};

const recipientOneName = `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`;
const recipientTwoName = `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`;
const recipientThreeName = `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`;
const recipientFourName = `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`;

const seed = faker.datatype.number({ min: 28000 });
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
  const groupName = `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`;
  let publicGroup;
  const publicGroupName = `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`;
  const specialGrantNumber = String(faker.datatype.number({ min: 2800 }));
  let grantGroupOne;
  let grantGroupTwo;
  let grants;
  let activityReports;
  let activityRecipients;
  let programs;

  beforeAll(async () => {
    mockUser = await User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
      lastLogin: new Date(),
    });

    mockUserTwo = await User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
      lastLogin: new Date(),
    });

    await Promise.all(recipients.map((g) => Recipient.create(g)));
    grants = await Promise.all([
      Grant.create({
        id: recipients[3].id,
        number: String(faker.datatype.number({ min: 2800 })),
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
        number: String(faker.datatype.number({ min: 2800 })),
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
        number: String(faker.datatype.number({ min: 2800 })),
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
        number: String(faker.datatype.number({ min: 2800 })),
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
        number: String(faker.datatype.number({ min: 2800 })),
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
        // Set id to a faker value to ensure it is not used.
        id: faker.datatype.number(),
        number: String(faker.datatype.number({ min: 2800 })),
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

    programs = await Program.bulkCreate([
      {
        id: recipients[0].id,
        grantId: recipients[0].id,
        startYear: 'no',
        startDate: 'no',
        endDate: 'no',
        status: 'Active',
        programType: 'EHS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: recipients[1].id,
        grantId: recipients[1].id,
        startYear: 'no',
        startDate: 'no',
        endDate: 'no',
        status: 'Active',
        programType: 'HS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: recipients[2].id,
        grantId: recipients[2].id,
        startYear: 'no',
        startDate: 'no',
        endDate: 'no',
        status: 'Active',
        programType: 'HS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { validate: true, individualHooks: true });

    group = await Group.create({
      name: groupName,
      userId: mockUser.id,
      isPublic: false,
    });

    publicGroup = await Group.create({
      name: publicGroupName,
      userId: mockUserTwo.id,
      isPublic: true,
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

    await GroupGrant.destroy({
      where: {
        groupId: [group.id, publicGroup.id],
      },
    });

    await Group.destroy({
      where: {
        userId: [mockUser.id, mockUserTwo.id],
      },
    });

    await User.destroy({
      where: {
        id: mockUser.id,
      },
    });

    await Program.destroy({
      where: {
        id: programs.map((p) => p.id),
      },
    });

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

    await sequelize.close();
  });

  describe('activeWithin', () => {
    it('before', async () => {
      const filters = { 'startDate.bef': '2022/07/31' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[0].id], recipients[4].id, recipients[5].id));
    });

    it('after', async () => {
      const filters = { 'startDate.aft': '2022/07/31' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id, recipients[3].id]));
    });

    it('after plus inactivation date', async () => {
      const filters = { 'startDate.aft': '2022/07/12' };
      const scope = await filtersToScopes(filters, { grant: { subset: true } });
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
          [Op.and]: [scope.grant, { id: possibleIds }],
        },
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
          [Op.and]: [scope.grant, { id: possibleIds }],
        },
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
          [Op.and]: [scope.grant, { id: grants.map((g) => g.id) }],
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
            where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
            where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toContain(recipients[2].id, recipients[5].id);
    });
    it('filters out', async () => {
      const filters = { 'programSpecialist.nctn': 'Darcy' };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
            where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
            where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[0].id);
    });
    it('filters out', async () => {
      const filters = { 'grantNumber.nctn': specialGrantNumber };
      const scope = await filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });

      expect(found.length).toBe(4);
      const foundGrants = found.map((f) => f.id).sort();
      expectedGrants.forEach((grant) => {
        expect(foundGrants).not.toContain(grant);
      });
    });
  });
});
