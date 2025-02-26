import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import {
  REPORT_STATUSES,
  APPROVER_STATUSES,
} from '@ttahub/common';
import { GOAL_STATUS } from '../../constants';
import filtersToScopes from '../index';
import { auditLogger } from '../../logger';
import db, {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportResource,
  ActivityRecipient,
  User,
  Recipient,
  Resource,
  Grant,
  ActivityReportCollaborator,
  OtherEntity,
  Program,
  Role,
  UserRole,
  Goal,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Topic,
  Group,
  GroupGrant,
  ActivityReportGoal,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  ActivityReportGoalFieldResponse,
  GroupCollaborator,
} from '../../models';
import {
  createReport,
  destroyReport,
  createGrant,
  createRecipient,
  createGoal,
} from '../../testUtils';
import { findOrCreateResources, processActivityReportForResourcesById } from '../../services/resource';
import { createActivityReportObjectiveFileMetaData } from '../../services/files';
import { formatDeliveryMethod } from './deliveryMethod';
import { myReportsScopes } from './myReports';

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user13706689',
  hsesUsername: 'user13706689',
  hsesUserId: 'user13706689',
  lastLogin: new Date(),
};

const mockUserTwo = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user137065478',
  hsesUsername: 'user137065478',
  hsesUserId: 'user137065478',
  lastLogin: new Date(),
};

const mockManager = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user50565590',
  hsesUsername: 'user50565590',
  hsesUserId: 'user50565590',
  lastLogin: new Date(),
};

const draftReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  version: 2,
};

const submittedReport = {
  ...draftReport,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['Children with Disabilities', 'Infants and Toddlers (ages birth to 3)'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

const approvedReport = {
  ...submittedReport,
  calculatedStatus: REPORT_STATUSES.APPROVED,
};

// Included to test default scope
const deletedReport = {
  submissionStatus: REPORT_STATUSES.DELETED,
  userId: mockUser.id,
  regionId: 1,
  version: 2,
};

const approverApproved = {
  userId: mockManager.id,
  status: APPROVER_STATUSES.APPROVED,
  note: 'great work',
};

const approverRejected = {
  userId: mockManager.id,
  status: APPROVER_STATUSES.NEEDS_ACTION,
  note: 'change x, y, z',
};

describe('filtersToScopes', () => {
  let globallyExcludedReport;
  let includedUser1;
  let includedUser2;
  let includedUser3;
  let excludedUser;

  beforeAll(async () => {
    await User.create(mockUser);
    await User.create(mockUserTwo);
    await User.create(mockManager);
    includedUser1 = await User.create({
      name: 'person',
      hsesUserId: 'user111',
      hsesUsername: 'user111',
      lastLogin: new Date(),
    });
    includedUser2 = await User.create({
      name: 'another person',
      hsesUserId: 'user222',
      hsesUsername: 'user222',
      lastLogin: new Date(),
    });

    includedUser3 = await User.create({
      name: 'third person',
      hsesUserId: 'user536',
      hsesUsername: 'user536',
    });

    excludedUser = await User.create({
      name: 'excluded',
      hsesUserId: 'user333',
      hsesUsername: 'user333',
      lastLogin: new Date(),
    });

    globallyExcludedReport = await ActivityReport.create({
      ...draftReport, deliveryMethod: 'method', updatedAt: '2000-01-01',
    }, {
      silent: true,
    });
    const granteeSpecialist = await Role.findOne({ where: { fullName: 'Grantee Specialist' } });
    if (!granteeSpecialist) {
      await Role.create({ name: 'GS', fullName: 'Grantee Specialist', isSpecialist: true });
    }

    const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } });
    if (!systemSpecialist) {
      await Role.create({ name: 'SS', fullName: 'System Specialist', isSpecialist: true });
    }

    const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } });
    if (!grantsSpecialist) {
      await Role.create({ name: 'GS', fullName: 'Grants Specialist', isSpecialist: true });
    }
  });

  afterAll(async () => {
    const userIds = [
      mockUser.id,
      mockUserTwo.id,
      mockManager.id,
      includedUser1.id,
      includedUser2.id,
      includedUser3.id,
      excludedUser.id];
    const reports = await ActivityReport.unscoped().findAll({
      where: {
        userId: userIds,
      },
    });
    const ids = reports.map((report) => report.id);
    await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true });
    await ActivityReport.unscoped().destroy({ where: { id: ids } });
    await User.destroy({
      where: {
        id: userIds,
      },
    });

    await db.sequelize.close();
  });

  describe('groups', () => {
    let reportIncluded;
    let reportExcluded;
    let possibleIds;

    let group;
    let publicGroup;
    let grant;

    beforeAll(async () => {
      group = await Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        isPublic: false,
      });

      await GroupCollaborator.create({
        groupId: group.id,
        userId: mockUser.id,
        collaboratorTypeId: 1,
      });

      publicGroup = await Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        isPublic: true,
      });

      await GroupCollaborator.create({
        groupId: publicGroup.id,
        userId: mockUserTwo.id,
        collaboratorTypeId: 1,
      });

      grant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
      });

      await GroupGrant.create({
        groupId: group.id,
        grantId: grant.id,
      });

      await GroupGrant.create({
        groupId: publicGroup.id,
        grantId: grant.id,
      });

      reportIncluded = await ActivityReport.create({ ...draftReport });
      reportExcluded = await ActivityReport.create({ ...draftReport });

      await ActivityRecipient.create({
        activityReportId: reportIncluded.id,
        grantId: grant.id,
      });

      possibleIds = [
        reportIncluded.id,
        reportExcluded.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          activityReportId: [
            reportIncluded.id, reportExcluded.id,
          ],
        },
      });
      await ActivityReport.destroy({
        where: { id: [reportIncluded.id, reportExcluded.id] },
      });
      await GroupGrant.destroy({
        where: { groupId: [group.id, publicGroup.id] },
      });

      await GroupCollaborator.destroy({
        where: { groupId: [group.id, publicGroup.id] },
      });

      await Group.destroy({
        where: { id: [group.id, publicGroup.id] },
      });
      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      });
    });

    it('filters by group', async () => {
      const filters = { 'group.in': [String(group.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      const groupIds = found.map((f) => f.id);
      expect(groupIds).toContain(reportIncluded.id);
    });

    it('filters by public group', async () => {
      const filters = { 'group.in': [String(publicGroup.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      const groupIds = found.map((f) => f.id);
      expect(groupIds).toContain(reportIncluded.id);
    });

    it('filters out by group', async () => {
      const filters = { 'group.nin': [String(group.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      const foundIds = found.map((f) => f.id);
      expect(foundIds).toContain(reportExcluded.id);
      expect(foundIds).toContain(globallyExcludedReport.id);
    });

    it('filters out by public group', async () => {
      const filters = { 'group.nin': [String(publicGroup.id)] };
      const scope = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      const foundIds = found.map((f) => f.id);
      expect(foundIds).toContain(reportExcluded.id);
      expect(foundIds).toContain(globallyExcludedReport.id);
    });
  });

  describe('reportId', () => {
    let reportIncluded;
    let reportIncludedLegacy;
    let reportExcluded;
    let possibleIds;

    beforeAll(async () => {
      reportIncluded = await ActivityReport.create({ ...draftReport, id: 12345 });
      reportIncludedLegacy = await ActivityReport.create(
        { ...draftReport, legacyId: 'R01-AR-012345' },
      );
      reportExcluded = await ActivityReport.create({ ...draftReport, id: 12346 });
      possibleIds = [
        reportIncluded.id,
        reportIncludedLegacy.id,
        reportExcluded.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [reportIncluded.id, reportIncludedLegacy.id, reportExcluded.id] },
      });
    });

    it('included has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.ctn': ['12345'] };
      const scope = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportIncluded.id, reportIncludedLegacy.id]));
    });

    it('excluded has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.nctn': ['12345'] };
      const scope = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([globallyExcludedReport.id, reportExcluded.id]));
    });
  });

  describe('ttaType', () => {
    let ttaReport;
    let trainingReport;
    let bothReport;
    let reportExcluded;
    let reportIds = [];

    beforeAll(async () => {
      ttaReport = await ActivityReport.create({ ...draftReport, ttaType: ['technical-assistance'] });
      trainingReport = await ActivityReport.create({ ...draftReport, ttaType: ['training'] });
      bothReport = await ActivityReport.create({ ...draftReport, ttaType: ['training,technical-assistance'] });
      reportExcluded = await ActivityReport.create({ ...draftReport, ttaType: ['balderdash'] });

      reportIds = [
        ttaReport.id,
        trainingReport.id,
        bothReport.id,
        reportExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.unscoped().destroy({
        where: {
          id: reportIds,
        },
        force: true,
      });
    });

    describe('tta', () => {
      it('contains', async () => {
        const filters = { 'ttaType.in': ['technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([ttaReport.id]));
      });

      it('does not contain', async () => {
        const filters = { 'ttaType.nin': ['technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(3);
        expect(found.map((f) => f.id).includes(ttaReport.id)).toBe(false);
      });
    });
    describe('training', () => {
      it('contains', async () => {
        const filters = { 'ttaType.in': ['training'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([trainingReport.id]));
      });
      it('does not contain', async () => {
        const filters = { 'ttaType.nin': ['training'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(3);
        expect(found.map((f) => f.id).includes(trainingReport.id)).toBe(false);
      });
    });

    describe('both', () => {
      it('contains', async () => {
        const filters = { 'ttaType.in': ['training,technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(1);
        expect(found.map((f) => f.id).includes(bothReport.id)).toBe(true);
      });
      it('does not contain', async () => {
        const filters = { 'ttaType.nin': ['training,technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(3);
        expect(found.map((f) => f.id).includes(bothReport.id)).toBe(false);
      });
    });
  });

  describe('recipient', () => {
    describe('for otherEntities', () => {
      let reportIncluded1;
      let reportIncluded2;
      let reportExcluded;

      let otherEntityIncluded1;
      let otherEntityIncluded2;
      let otherEntityExcluded;

      let possibleIds;

      beforeAll(async () => {
        otherEntityIncluded1 = await OtherEntity.create({ id: 40, name: 'test' });
        otherEntityIncluded2 = await OtherEntity.create({ id: 41, name: 'another test' });
        otherEntityExcluded = await OtherEntity.create({ id: 42, name: 'otherEntity' });

        reportIncluded1 = await ActivityReport.create({ ...draftReport });
        reportIncluded2 = await ActivityReport.create({ ...draftReport });
        reportExcluded = await ActivityReport.create({ ...draftReport });

        await ActivityRecipient.create({
          activityReportId: reportIncluded1.id,
          otherEntityId: otherEntityIncluded1.id,
        });
        await ActivityRecipient.create({
          activityReportId: reportIncluded2.id,
          otherEntityId: otherEntityIncluded2.id,
        });
        await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          otherEntityId: otherEntityExcluded.id,
        });
        possibleIds = [
          reportIncluded1.id,
          reportIncluded2.id,
          reportExcluded.id,
          globallyExcludedReport.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
        });
        await OtherEntity.destroy({
          where: { id: [otherEntityIncluded1.id, otherEntityIncluded2.id, otherEntityExcluded.id] },
        });
      });

      it('includes other-entities with a partial match', async () => {
        const filters = { 'recipient.ctn': ['test'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes other-entities that do not partial match or have no other-entities', async () => {
        const filters = { 'recipient.nctn': ['test'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcludedReport.id]));
      });
    });

    describe('for grants', () => {
      let reportIncluded1;
      let reportIncluded2;
      let reportExcluded;

      let recipientIncluded1;
      let recipientIncluded2;
      let recipientExcluded;

      let grantIncluded1;
      let grantIncluded2;
      let grantExcluded;

      let possibleIds;

      beforeAll(async () => {
        recipientIncluded1 = await Recipient.create({ id: 50, name: '1234', uei: 'NNA5N2KHMGN2' });
        recipientIncluded2 = await Recipient.create({ id: 51, name: 'testing 1234', uei: 'NNA5N2KHMBA2' });
        recipientExcluded = await Recipient.create({ id: 52, name: '4321', uei: 'NNA5N2KHMBC2' });

        grantIncluded1 = await Grant.create({
          id: recipientIncluded1.id, number: 1234, recipientId: recipientIncluded1.id,
        });
        grantIncluded2 = await Grant.create({
          id: recipientIncluded2.id, number: 1235, recipientId: recipientIncluded2.id,
        });
        grantExcluded = await Grant.create({
          id: recipientExcluded.id, number: 456, recipientId: recipientExcluded.id,
        });

        reportIncluded1 = await ActivityReport.create({ ...draftReport });
        reportIncluded2 = await ActivityReport.create({ ...draftReport });
        reportExcluded = await ActivityReport.create({ ...draftReport });

        await ActivityRecipient.create({
          activityReportId: reportIncluded1.id,
          grantId: grantIncluded1.id,
        });

        await ActivityRecipient.create({
          activityReportId: reportIncluded2.id,
          grantId: grantIncluded2.id,
        });

        await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          grantId: grantExcluded.id,
        });

        possibleIds = [
          reportIncluded1.id,
          reportIncluded2.id,
          reportExcluded.id,
          globallyExcludedReport.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
        });
        await Grant.destroy({
          where: { id: [grantIncluded1.id, grantIncluded2.id, grantExcluded.id] },
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: [recipientIncluded1.id, recipientIncluded2.id, recipientExcluded.id] },
        });
      });

      it('includes recipients with a partial match', async () => {
        const filters = { 'recipient.ctn': ['1234'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes recipients that do not partial match or have no recipients', async () => {
        const filters = { 'recipient.nctn': ['1234'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcludedReport.id]));
      });

      it('grant number with matches', async () => {
        const filters = { 'grantNumber.ctn': ['123'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('grant number with no matches', async () => {
        const filters = { 'grantNumber.ctn': ['789'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(0);
      });

      it('grant numbers excludes matches', async () => {
        const filters = { 'grantNumber.nctn': ['123'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcludedReport.id]));
      });
    });

    describe('single or multi recipient', () => {
      let multiRecipientReport;
      let singleRecipientReport;
      let excludedReport;

      let multiRecipient1;
      let multiRecipient2;

      let singleRecipient;
      let singleRecipient2; // Same UEI.

      let excludedRecipient;

      let multiRecipientGrant1;
      let multiRecipientGrant2;
      let singleRecipientGrant;
      let singleRecipientGrant2;
      let excludedGrant;

      let recipientIds;
      let grantIds;
      let reportIds;

      beforeAll(async () => {
        // Recipients.
        multiRecipient1 = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
        });
        multiRecipient2 = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: faker.datatype.string(12),
        });
        singleRecipient = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: 'sample-single-recipient-same-uei',
        });
        singleRecipient2 = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: 'sample-single-recipient-same-uei',
        });
        excludedRecipient = await Recipient.create({
          id: faker.datatype.number({ min: 64000 }),
          name: faker.random.alphaNumeric(6),
          uei: faker.datatype.string(12),
        });

        recipientIds = [
          multiRecipient1.id,
          multiRecipient2.id,
          singleRecipient.id,
          singleRecipient2.id,
          excludedRecipient.id,
        ];

        // Grants.
        multiRecipientGrant1 = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: multiRecipient1.id,
        });
        multiRecipientGrant2 = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: multiRecipient2.id,
        });
        singleRecipientGrant = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: singleRecipient.id,
        });
        singleRecipientGrant2 = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: singleRecipient2.id,
        });
        excludedGrant = await Grant.create({
          id: faker.datatype.number({ min: 64000 }),
          number: faker.datatype.string(6),
          uei: faker.datatype.string(12),
          recipientId: excludedRecipient.id,
        });

        grantIds = [
          multiRecipientGrant1.id,
          multiRecipientGrant2.id,
          singleRecipientGrant.id,
          singleRecipientGrant2.id,
        ];

        // Reports.
        multiRecipientReport = await ActivityReport.create({ ...draftReport });
        singleRecipientReport = await ActivityReport.create({ ...draftReport });
        excludedReport = await ActivityReport.create({ ...draftReport });

        reportIds = [multiRecipientReport.id, singleRecipientReport.id, excludedReport.id];

        // Activity Recipients.
        await ActivityRecipient.create({
          activityReportId: multiRecipientReport.id,
          grantId: multiRecipientGrant1.id,
        });

        await ActivityRecipient.create({
          activityReportId: multiRecipientReport.id,
          grantId: multiRecipientGrant2.id,
        });

        await ActivityRecipient.create({
          activityReportId: singleRecipientReport.id,
          grantId: singleRecipientGrant.id,
        });

        // Same UEI should count as single recipient.
        await ActivityRecipient.create({
          activityReportId: singleRecipientReport.id,
          grantId: singleRecipientGrant2.id,
        });

        await ActivityRecipient.create({
          activityReportId: excludedReport.id,
          grantId: excludedGrant.id,
        });
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: reportIds,
          },
        });
        await ActivityReport.destroy({
          where: { id: reportIds },
        });
        await Grant.destroy({
          where: { id: grantIds },
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: recipientIds },
        });
      });

      it('retrieves reports with more than one recipient', async () => {
        const filters = { 'singleOrMultiRecipients.in': ['multi-recipients'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: reportIds }] },
        });
        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([multiRecipientReport.id]));
      });

      it('retrieves reports with one recipient', async () => {
        const filters = { 'singleOrMultiRecipients.in': ['single-recipient'] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: reportIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([singleRecipientReport.id, excludedReport.id]));
      });
    });

    describe('recipientId', () => {
      let reportIncluded;
      let reportExcluded;

      let recipientIncluded;
      let recipientExcluded;

      let grantIncluded;
      let grantExcluded;

      let possibleIds;

      beforeAll(async () => {
        recipientIncluded = await Recipient.create({ id: 54, name: '1234', uei: 'NNA5N2KHMGN2' });
        recipientExcluded = await Recipient.create({ id: 56, name: '4321', uei: 'NNA5N2KHMBA2' });

        grantIncluded = await Grant.create({
          id: recipientIncluded.id, number: 2234, recipientId: recipientIncluded.id,
        });
        grantExcluded = await Grant.create({
          id: recipientExcluded.id, number: 2236, recipientId: recipientExcluded.id,
        });

        reportIncluded = await ActivityReport.create({ ...draftReport });
        reportExcluded = await ActivityReport.create({ ...draftReport });

        await ActivityRecipient.create({
          activityReportId: reportIncluded.id,
          grantId: grantIncluded.id,
        });
        await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          grantId: grantExcluded.id,
        });
        possibleIds = [
          reportIncluded.id,
          reportExcluded.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [reportIncluded.id, reportExcluded.id],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded.id, reportExcluded.id] },
        });
        await Grant.destroy({
          where: { id: [grantIncluded.id, grantExcluded.id] },
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: [recipientIncluded.id, recipientExcluded.id] },
        });
      });

      it('includes recipients with a matching id', async () => {
        const filters = { 'recipientId.ctn': [recipientIncluded.id] };
        const { activityReport: scope } = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded.id]));
      });
    });
  });

  describe('startDate', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create({ ...draftReport, startDate: '2020-01-01' });
      secondReport = await ActivityReport.create({ ...draftReport, startDate: '2021-01-01' });
      thirdReport = await ActivityReport.create({ ...draftReport, startDate: '2022-01-01' });
      fourthReport = await ActivityReport.create({ ...draftReport, startDate: '2023-01-01' });
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with start dates before the given date', async () => {
      const filters = { 'startDate.bef': '2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id]));
    });

    it('after returns reports with start dates before the given date', async () => {
      const filters = { 'startDate.aft': '2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('within returns reports with start dates between the two dates', async () => {
      const filters = { 'startDate.win': '2020/06/06-2022/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });

    it('within returns reports with start dates when the filters are an array', async () => {
      const filters = { 'startDate.win': ['2020/06/06-2022/06/06', '2020/06/05-2021/06/05'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });
  });

  describe('lastSaved', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true });
      secondReport = await ActivityReport.create({ ...draftReport, updatedAt: '2021-01-01' }, { silent: true });
      thirdReport = await ActivityReport.create({ ...draftReport, updatedAt: '2022-01-01' }, { silent: true });
      fourthReport = await ActivityReport.create({ ...draftReport, updatedAt: '2023-01-01' }, { silent: true });
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with updated ats before the given date', async () => {
      const filters = { 'lastSaved.bef': '2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          firstReport.id, secondReport.id, globallyExcludedReport.id]));
    });

    it('after returns reports with updated ats before the given date', async () => {
      const filters = { 'lastSaved.aft': '2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('handles an array of querys', async () => {
      const filters = { 'lastSaved.aft': ['2021/06/06', '2021/06/05'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('within returns reports with updated ats between the two dates', async () => {
      const filters = { 'lastSaved.win': '2020/06/06-2022/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });
  });

  describe('creator', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({ ...draftReport, userId: includedUser1.id });
      includedReport2 = await ActivityReport.create({ ...draftReport, userId: includedUser2.id });
      excludedReport = await ActivityReport.create({ ...draftReport, userId: excludedUser.id });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'creator.ctn': ['person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('trims the string', async () => {
      const filters = { 'creator.ctn': [' person '] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'creator.nctn': ['person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcludedReport.id]));
    });
  });

  describe('topic', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;

    let recipient;
    let grant;
    let goal;
    let objective;
    let aro1;
    let aro2;
    let topic1;
    let topic2;

    let possibleIds;

    beforeAll(async () => {
      // Reports.
      includedReport1 = await ActivityReport.create({
        ...draftReport,
        topics: ['Topic 1', 'Topic 2'],
      });
      includedReport2 = await ActivityReport.create({
        ...draftReport,
        topics: ['Topic 1', 'Topic 3'],
      });
      excludedReport = await ActivityReport.create({ ...draftReport, topics: ['another topic'] });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];

      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 64000 }),
        name: faker.random.alphaNumeric(6),
        uei: faker.datatype.string(12),
      });

      // Grant.
      grant = await Grant.create({
        number: recipient.id,
        recipientId: recipient.id,
        programSpecialistName: faker.name.firstName(),
        regionId: 1,
        id: faker.datatype.number({ min: 64000 }),
      });

      // Goal.
      goal = await Goal.create({
        name: 'Topic Goal on activity report',
        status: 'In Progress',
        timeframe: '12 months',
        grantId: grant.id,
        isFromSmartsheetTtaPlan: false,
        id: faker.datatype.number({ min: 64000 }),
      });

      // Objective.
      objective = await Objective.create({
        goalId: goal.id,
        title: 'topic objective test',
        status: 'Not Started',
      });

      // Activity report objective.
      aro1 = await ActivityReportObjective.create({
        activityReportId: includedReport1.id,
        objectiveId: objective.id,
      });

      aro2 = await ActivityReportObjective.create({
        activityReportId: includedReport2.id,
        objectiveId: objective.id,
      });

      // Topic.
      topic1 = await Topic.create({
        name: 'Topic 4',
      });

      topic2 = await Topic.create({
        name: 'Topic 2',
      });

      // ARO topic.
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro1.id,
        topicId: topic1.id,
      });

      // ARO topic.
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro2.id,
        topicId: topic2.id,
      });
    });

    afterAll(async () => {
      // Delete aro's.
      await ActivityReportObjectiveTopic.destroy({
        where: { activityReportObjectiveId: [aro1.id, aro2.id] },
      });

      // Delete Topics.
      await Topic.destroy({
        where: { id: [topic1.id, topic2.id] },
        individualHooks: true,
        force: true,
      });

      // Delete aro.
      await ActivityReportObjective.destroy({
        where: { id: aro1.id },
      });

      await ActivityReportObjective.destroy({
        where: { id: aro2.id },
      });

      // Delete objective.
      await Objective.destroy({
        where: {
          id: objective.id,
        },
        force: true,
      });

      // Delete goal.
      await Goal.destroy({
        where: {
          id: goal.id,
        },
        force: true,
      });

      // Delete reports.
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });

      // Delete grant.
      await Grant.destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
      });

      // Delete recipient.
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('includes topics with a match', async () => {
      const filters = { 'topic.in': ['Topic 3'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport2.id]));
    });

    it('includes aro topic with a match', async () => {
      const filters = { 'topic.in': ['Topic 4'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id]));
    });

    it('includes aro topic and topic with a match', async () => {
      const filters = { 'topic.in': ['Topic 2'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes topics that do not match', async () => {
      const filters = { 'topic.nin': ['Topic 1'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcludedReport.id]));
    });

    it('excludes aro topics that do not match', async () => {
      const filters = { 'topic.nin': ['Topic 4'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          includedReport2.id,
          excludedReport.id,
          globallyExcludedReport.id]));
    });

    it('excludes aro topic and topics that do not match', async () => {
      const filters = { 'topic.nin': ['Topic 3', 'Topic 4'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcludedReport.id]));
    });
  });

  describe('collaborators', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    let includedActivityReportCollaborator1;
    let includedActivityReportCollaborator2;
    let excludedActivityReportCollaborator;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create(draftReport);
      includedReport2 = await ActivityReport.create(draftReport);
      excludedReport = await ActivityReport.create(draftReport);

      includedActivityReportCollaborator1 = await ActivityReportCollaborator.create({
        activityReportId: includedReport1.id, userId: includedUser1.id,
      });
      includedActivityReportCollaborator2 = await ActivityReportCollaborator.create({
        activityReportId: includedReport2.id, userId: includedUser2.id,
      });
      excludedActivityReportCollaborator = await ActivityReportCollaborator.create({
        activityReportId: excludedReport.id, userId: excludedUser.id,
      });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
      await ActivityReportCollaborator.destroy({
        where: {
          id: [
            includedActivityReportCollaborator1.id,
            includedActivityReportCollaborator2.id,
            excludedActivityReportCollaborator.id,
          ],
        },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'collaborators.ctn': ['person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'collaborators.nctn': ['person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcludedReport.id]));
    });
  });

  describe('activityReportGoalResponse', () => {
    let recipient;
    let grant;
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleReportIds;

    let goal;
    let goalTwo;
    let goalThree;
    let goalTemplateFieldPrompt;
    let goalFieldResponse;
    let activityReportGoalFieldResponse1;
    let activityReportGoalFieldResponse2;
    let activityReportGoalFieldResponse3;

    beforeAll(async () => {
      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 133434 }),
        name: faker.name.firstName(),
      });

      // Grant.
      grant = await Grant.create({
        id: faker.datatype.number({ min: 133434 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      // Goal.
      goal = await Goal.create({
        name: 'Goal Response Test',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      goalTwo = await Goal.create({
        name: 'Goal Response Test Two',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      goalThree = await Goal.create({
        name: 'Goal Response Test Three',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      // Reports.
      includedReport1 = await ActivityReport.create(draftReport);
      includedReport2 = await ActivityReport.create(draftReport);
      excludedReport = await ActivityReport.create(draftReport);
      possibleReportIds = [includedReport1.id, includedReport2.id, excludedReport.id];

      // Get GoalTemplateFieldPrompt with the title 'FEI root cause'.
      goalTemplateFieldPrompt = await GoalTemplateFieldPrompt.findOne({
        where: { title: 'FEI root cause' },
      });

      // Create GoalFieldResponse.
      goalFieldResponse = await GoalFieldResponse.create({
        goalId: goal.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Community Partnerships'],
      });

      // ActivityReportGoals.
      const activityReportGoal1 = await ActivityReportGoal.create({
        activityReportId: includedReport1.id,
        goalId: goal.id,
      });

      const activityReportGoal2 = await ActivityReportGoal.create({
        activityReportId: includedReport2.id,
        goalId: goalTwo.id,
      });

      const activityReportGoal3 = await ActivityReportGoal.create({
        activityReportId: excludedReport.id,
        goalId: goalThree.id,
      });

      // Create ActivityReportGoalFieldResponse.
      activityReportGoalFieldResponse1 = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoal1.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Community Partnerships'],
      });
      activityReportGoalFieldResponse2 = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoal2.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Workforce', 'Community Partnerships', 'Family Circumstances'],
      });
      activityReportGoalFieldResponse3 = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoal3.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Other ECE Care Option'],
      });
    });

    afterAll(async () => {
      // Destroy ActivityReportGoalFieldResponses.
      await ActivityReportGoalFieldResponse.destroy({
        where: {
          id: [
            activityReportGoalFieldResponse1.id,
            activityReportGoalFieldResponse2.id,
            activityReportGoalFieldResponse3.id,
          ],
        },
      });

      // Destroy GoalFieldResponse.
      await GoalFieldResponse.destroy({
        where: { id: goalFieldResponse.id },
      });

      // Destroy ActivityReportGoals.
      await ActivityReportGoal.destroy({
        where: {
          activityReportId: [
            includedReport1.id,
            includedReport2.id,
            excludedReport.id,
          ],
        },
      });

      // Destroy Reports.
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });

      // Destroy Goal.
      await Goal.destroy({
        where: { id: [goal.id, goalTwo.id, goalThree.id] },
      });

      // Destroy Grant.
      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      });

      // Destroy Recipient.
      await Recipient.destroy({
        where: { id: recipient.id },
      });
    });

    it('find reports with fei root cause response', async () => {
      const filters = { 'activityReportGoalResponse.in': ['Community Partnerships'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleReportIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('find reports without fei root cause response', async () => {
      const filters = { 'activityReportGoalResponse.nin': ['Community Partnerships'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleReportIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id]));
    });
  });

  describe('specialistName', () => {
    let includeCollaboratorReport;
    let includeCreatorReport;
    let excludedReport;
    let possibleIds;

    let includedActivityReportCollaborator1;
    let includedActivityReportCollaborator2;
    let excludedActivityReportCollaborator;

    beforeAll(async () => {
      // Collaborator report.
      includeCollaboratorReport = await ActivityReport.create({
        ...draftReport, userId: includedUser3.id,
      });

      // Creator report.
      includeCreatorReport = await ActivityReport.create({
        ...draftReport, userId: includedUser2.id,
      });

      // Exclude report.
      excludedReport = await ActivityReport.create(draftReport);

      // Collaborators.
      includedActivityReportCollaborator1 = await ActivityReportCollaborator.create({
        activityReportId: includeCollaboratorReport.id, userId: includedUser1.id,
      });

      includedActivityReportCollaborator2 = await ActivityReportCollaborator.create({
        activityReportId: includeCreatorReport.id, userId: includedUser3.id,
      });

      excludedActivityReportCollaborator = await ActivityReportCollaborator.create({
        activityReportId: excludedReport.id, userId: excludedUser.id,
      });
      possibleIds = [
        includeCollaboratorReport.id,
        includeCreatorReport.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includeCollaboratorReport.id, includeCreatorReport.id, excludedReport.id] },
      });
      await ActivityReportCollaborator.destroy({
        where: {
          id: [
            includedActivityReportCollaborator1.id,
            includedActivityReportCollaborator2.id,
            excludedActivityReportCollaborator.id,
          ],
        },
      });
    });

    it('finds the report by collaborator', async () => {
      const filters = { 'specialistName.collaborator': [includedUser1.name] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includeCollaboratorReport.id, includeCreatorReport.id]));
    });

    it('finds the report by creator', async () => {
      const filters = { 'specialistName.creator': [includedUser2.name] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includeCreatorReport.id]));
    });

    it('finds the report by both', async () => {
      const filters = { 'specialistName.both': [includedUser3.name] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includeCollaboratorReport.id, includeCreatorReport.id]));
    });
  });

  describe('calculatedStatus', () => {
    let includedReportMultApprover;
    let excludedReportMultApprover;
    let possibleIds;

    beforeAll(async () => {
      includedReportMultApprover = await ActivityReport.create(submittedReport);
      await ActivityReportApprover.create({
        ...approverApproved,
        activityReportId: includedReportMultApprover.id,
      });

      excludedReportMultApprover = await ActivityReport.create(submittedReport);
      await ActivityReportApprover.create({
        ...approverRejected,
        activityReportId: excludedReportMultApprover.id,
      });
      possibleIds = [
        includedReportMultApprover.id,
        excludedReportMultApprover.id,
        globallyExcludedReport.id,
      ];
    });

    it('includes statuses with a partial match', async () => {
      const filters = { 'calculatedStatus.in': ['approved'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          includedReportMultApprover.id,
        ]));
    });

    it('excludes statuses that do not partial match', async () => {
      const filters = { 'calculatedStatus.nin': ['app'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          excludedReportMultApprover.id,
          globallyExcludedReport.id,
        ]));
    });
  });

  describe('role', () => {
    const possibleIds = [faker.datatype.number(), faker.datatype.number(), faker.datatype.number()];

    beforeAll(async () => {
      const granteeSpecialist = await Role.findOne({ where: { fullName: 'Grantee Specialist' } });
      const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } });
      const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } });

      await User.create({
        id: possibleIds[0],
        name: 'u777',
        hsesUsername: 'u777',
        hsesUserId: '777',
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: possibleIds[0],
        roleId: granteeSpecialist.id,
      });

      await UserRole.create({
        userId: possibleIds[0],
        roleId: systemSpecialist.id,
      });

      await User.create({
        id: possibleIds[1],
        name: 'u778',
        hsesUsername: 'u778',
        hsesUserId: '778',
        role: ['Grantee Specialist'],
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: possibleIds[1],
        roleId: granteeSpecialist.id,
      });

      await User.create({
        id: possibleIds[2],
        name: 'u779',
        hsesUsername: 'u779',
        hsesUserId: '779',
        role: ['Grants Specialist'],
        lastLogin: new Date(),
      });

      await UserRole.create({
        userId: possibleIds[2],
        roleId: grantsSpecialist.id,
      });

      await ActivityReport.create({
        ...approvedReport, id: possibleIds[0], userId: possibleIds[0],
      });
      await ActivityReport.create({
        ...approvedReport, id: possibleIds[1], userId: possibleIds[1],
      });
      await ActivityReport.create({
        ...approvedReport, id: possibleIds[2], userId: possibleIds[2],
      });
      await ActivityReportCollaborator.create({
        id: possibleIds[0],
        activityReportId: possibleIds[1],
        userId: possibleIds[1],
      });
    });

    afterAll(async () => {
      await ActivityReportCollaborator.destroy({
        where: {
          id: possibleIds,
        },
      });
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });

      await UserRole.destroy({
        where: {
          userId: possibleIds,
        },
      });

      await User.destroy({
        where: {
          id: possibleIds,
        },
      });
    });
    it('finds reports based on author role', async () => {
      const filters = { 'role.in': ['System Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([possibleIds[0]]);
    });

    it('filters out reports based on author role', async () => {
      const filters = { 'role.nin': ['System Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id).sort()).toStrictEqual([possibleIds[1], possibleIds[2]].sort());
    });

    it('finds reports based on collaborator role', async () => {
      const filters = { 'role.in': ['Grantee Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual([possibleIds[0], possibleIds[1]].sort());
    });

    it('filters out reports based on collaborator role', async () => {
      const filters = { 'role.nin': ['Grantee Specialist'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual([possibleIds[2]].sort());
    });

    it('only allows valid roles to be passed', async () => {
      let filters = { 'role.in': ['DROP * FROM *'] };
      let scope = await filtersToScopes(filters);
      let found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual(possibleIds.sort());

      filters = { 'role.nin': ['Grantee Specialist & Potato Salesman'] };
      scope = await filtersToScopes(filters);
      found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id).sort()).toStrictEqual(possibleIds.sort());
    });
  });

  describe('target population', () => {
    let reportOne;
    let reportTwo;
    let reportThree;
    let reportFour;
    let possibleIds;

    beforeAll(async () => {
      reportOne = await ActivityReport.create(submittedReport);
      reportTwo = await ActivityReport.create({
        ...submittedReport,
        targetPopulations: ['Infants and Toddlers (ages birth to 3)'],
      });
      reportThree = await ActivityReport.create({
        ...submittedReport,
        targetPopulations: ['Dual-Language Learners'],
      });
      reportFour = await ActivityReport.create({
        ...submittedReport,
        targetPopulations: [],
      });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        reportFour.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });
    });

    it('filters by reports containing said population', async () => {
      const filters = { 'targetPopulations.in': ['Infants and Toddlers (ages birth to 3)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });

    it('filters out the appropriate population', async () => {
      const filters = { 'targetPopulations.nin': ['Infants and Toddlers (ages birth to 3)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportThree.id, reportFour.id]));
    });

    it('only filters by possible population values', async () => {
      const filters = { 'targetPopulations.in': ['(DROP SCHEMA public CASCADE)', 'Infants and Toddlers (ages birth to 3)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });

    it('filters out bad population values', async () => {
      const filters = { 'targetPopulations.in': ['(DROP SCHEMA public CASCADE)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(4);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining(
          [reportOne.id, reportTwo.id, reportThree.id, reportFour.id],
        ));
    });
  });

  describe('reason', () => {
    let possibleIds;
    let reportOne;
    let reportTwo;
    let reportThree;
    let reportFour;

    beforeAll(async () => {
      reportOne = await ActivityReport.create({ ...approvedReport, reason: ['School Readiness Goals', 'Child Incident'] });
      reportTwo = await ActivityReport.create({ ...approvedReport, reason: ['School Readiness Goals', 'Ongoing Quality Improvement'] });
      reportThree = await ActivityReport.create({ ...approvedReport, reason: ['COVID-19 response'] });
      reportFour = await ActivityReport.create({ ...approvedReport, reason: [] });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        reportFour.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });
    });

    it('returns reports with a specific reason', async () => {
      const filters = { 'reason.in': ['School Readiness Goals'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });

    it('returns reports without a specific reason', async () => {
      const filters = { 'reason.nin': ['School Readiness Goals'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportThree.id, reportFour.id]));
    });

    it('only searches by allowed reasons', async () => {
      const filters = { 'reason.in': ['Pesky the Clown'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(4);
    });
  });

  describe('participants', () => {
    let possibleIds;
    let reportOne;
    let reportTwo;
    let reportThree;
    let reportFour;

    beforeAll(async () => {
      reportOne = await ActivityReport.create({ ...approvedReport, participants: ['Fiscal Manager/Team', 'Coach'] });
      reportTwo = await ActivityReport.create({ ...approvedReport, participants: ['HSCO', 'Regional TTA Team / Specialists'] });
      reportThree = await ActivityReport.create({ ...approvedReport, participants: ['Coach'] });
      reportFour = await ActivityReport.create({ ...approvedReport, participants: [] });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        reportFour.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });
    });

    it('returns reports with a specific participant', async () => {
      const filters = { 'participants.in': ['Coach'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(
        found.map((f) => f.id),
      ).toEqual(
        expect.arrayContaining([reportOne.id, reportThree.id]),
      );
    });

    it('returns reports without a specific participiant', async () => {
      const filters = { 'participants.nin': ['Coach'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportTwo.id, reportFour.id]));
    });

    it('only searches by allowed participiant', async () => {
      const filters = { 'participants.in': ['invalid participant'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(4);
    });
  });

  describe('program specialist', () => {
    let reportIncluded1;
    let reportIncluded2;
    let reportExcluded;

    let recipientIncluded1;
    let recipientIncluded2;
    let recipientExcluded;

    let grantIncluded1;
    let grantIncluded2;
    let grantExcluded;

    let possibleIds;

    beforeAll(async () => {
      recipientIncluded1 = await Recipient.create({ id: 120, name: 'Recipient 1 PS', uei: 'NNA5N2KHMGN2' });
      recipientIncluded2 = await Recipient.create({ id: 121, name: 'Recipient 2 PS', uei: 'NNA5N2KHMBA2' });
      recipientExcluded = await Recipient.create({ id: 122, name: 'Recipient 3 PS', uei: 'NNA5N2KHMBC2' });

      grantIncluded1 = await Grant.create({
        id: recipientIncluded1.id, number: 64968, recipientId: recipientIncluded1.id, programSpecialistName: 'Pat Bowman',
      });
      grantIncluded2 = await Grant.create({
        id: recipientIncluded2.id, number: 85248, recipientId: recipientIncluded2.id, programSpecialistName: 'Patton Blake',
      });
      grantExcluded = await Grant.create({
        id: recipientExcluded.id, number: 45877, recipientId: recipientExcluded.id, programSpecialistName: 'Jon Jones',
      });

      reportIncluded1 = await ActivityReport.create({ ...draftReport });
      reportIncluded2 = await ActivityReport.create({ ...draftReport });
      reportExcluded = await ActivityReport.create({ ...draftReport });

      await ActivityRecipient.create({
        activityReportId: reportIncluded1.id,
        grantId: grantIncluded1.id,
      });
      await ActivityRecipient.create({
        activityReportId: reportIncluded2.id,
        grantId: grantIncluded2.id,
      });
      await ActivityRecipient.create({
        activityReportId: reportExcluded.id,
        grantId: grantExcluded.id,
      });
      possibleIds = [
        reportIncluded1.id,
        reportIncluded2.id,
        reportExcluded.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
        },
      });
      await ActivityReport.destroy({
        where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
      });
      await Grant.destroy({
        where: { id: [grantIncluded1.id, grantIncluded2.id, grantExcluded.id] },
        individualHooks: true,
      });
      await Recipient.destroy({
        where: { id: [recipientIncluded1.id, recipientIncluded2.id, recipientExcluded.id] },
      });
    });

    it('includes program specialist with a partial match', async () => {
      const filters = { 'programSpecialist.ctn': ['pat'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
    });

    it('excludes recipients that do not partial match or have no recipients', async () => {
      const filters = { 'programSpecialist.nctn': ['pat'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcludedReport.id]));
    });
  });

  describe('programType', () => {
    let possibleIds;
    let reportOne;
    let reportTwo;
    let reportThree;
    let grantIds;

    beforeAll(async () => {
      reportOne = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      reportTwo = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      reportThree = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        globallyExcludedReport.id,
      ];

      const dummyProgram = {
        startYear: '2020',
        startDate: '2020-09-01',
        endDate: '2020-09-02',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const reportOneRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportOne.id,
        },
      });

      const reportTwoRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportTwo.id,
        },
      });

      const reportThreeRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportThree.id,
        },
      });

      grantIds = [
        ...reportOneRecipients.map((r) => r.grantId),
        ...reportTwoRecipients.map((r) => r.grantId),
        ...reportThreeRecipients.map((r) => r.grantId),
      ];

      await Promise.all([
        ...reportOneRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'EHS',
          }).catch((err) => auditLogger.error(err));
        }),
        ...reportTwoRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'EHS',
          }).catch((err) => auditLogger.error(err));
        }),
        ...reportThreeRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'HS',
          }).catch((err) => auditLogger.error(err));
        }),
      ]);
    });

    afterAll(async () => {
      await Program.destroy({
        where: {
          grantId: grantIds,
        },
      });

      await destroyReport(reportOne);
      await destroyReport(reportTwo);
      await destroyReport(reportThree);
    });

    it('includes program type', async () => {
      const filters = { 'programType.in': ['EHS', 'HS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id, reportThree.id]));
    });

    it('excludes program type', async () => {
      const filters = { 'programType.nin': ['EHS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportThree.id, globallyExcludedReport.id]));
    });

    it('excludes multiple program types', async () => {
      const filters = { 'programType.nin': ['EHS', 'HS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([globallyExcludedReport.id]));
    });
  });

  describe('myReports', () => {
    let possibleIds;
    let reportOne;
    let reportTwo;
    let reportThree;
    let grantIds;

    beforeAll(async () => {
      reportOne = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        userId: mockUser.id,
      });

      await ActivityReportCollaborator.create({
        activityReportId: reportOne.id, userId: mockUserTwo.id,
      });

      reportTwo = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        userId: mockUserTwo.id,
      });
      reportThree = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      await ActivityReportApprover.create({
        userId: mockUserTwo.id,
        activityReportId: reportThree.id,
      });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        globallyExcludedReport.id,
      ];

      const dummyProgram = {
        startYear: '2020',
        startDate: '2020-09-01',
        endDate: '2020-09-02',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const reportOneRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportOne.id,
        },
      });

      const reportTwoRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportTwo.id,
        },
      });

      const reportThreeRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportThree.id,
        },
      });

      grantIds = [
        ...reportOneRecipients.map((r) => r.grantId),
        ...reportTwoRecipients.map((r) => r.grantId),
        ...reportThreeRecipients.map((r) => r.grantId),
      ];

      await Promise.all([
        ...reportOneRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'EHS',
          }).catch((err) => auditLogger.error(err));
        }),
        ...reportTwoRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'EHS',
          }).catch((err) => auditLogger.error(err));
        }),
        ...reportThreeRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'HS',
          }).catch((err) => auditLogger.error(err));
        }),
      ]);
    });

    afterAll(async () => {
      await Program.destroy({
        where: {
          grantId: grantIds,
        },
      });

      await ActivityReportCollaborator.destroy({ where: { userId: mockUserTwo.id } });
      await ActivityReportApprover.destroy({
        where: { activityReportId: reportThree.id }, force: true,
      });
      await destroyReport(reportOne);
      await destroyReport(reportTwo);
      await destroyReport(reportThree);
    });

    it('includes creator my reports', async () => {
      const filters = { 'myReports.in': ['Creator'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportTwo.id]));
    });

    it('excludes creator my reports', async () => {
      const filters = { 'myReports.nin': ['Creator'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportThree.id, globallyExcludedReport.id]));
    });

    it('includes collaborator my reports', async () => {
      const filters = { 'myReports.in': ['Collaborator'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id]));
    });

    it('excludes collaborator my reports', async () => {
      const filters = { 'myReports.nin': ['Collaborator'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportTwo.id, reportThree.id, globallyExcludedReport.id]));
    });

    it('includes approver my reports', async () => {
      const filters = { 'myReports.in': ['Approver'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportThree.id]));
    });

    it('excludes approver my reports', async () => {
      const filters = { 'myReports.nin': ['Approver'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id, globallyExcludedReport.id]));
    });

    it('includes all my reports', async () => {
      const filters = { 'myReports.in': ['Creator', 'Collaborator', 'Approver'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id, reportThree.id]));
    });

    it('excludes all my reports', async () => {
      const filters = { 'myReports.nin': ['Creator', 'Collaborator', 'Approver'] };
      const { activityReport: scope } = await filtersToScopes(
        filters,
        { userId: mockUserTwo.id },
      );
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([globallyExcludedReport.id]));
    });

    it('should return an empty object for invalid roles and log a warning', () => {
      jest.spyOn(auditLogger, 'info').mockImplementation(() => {});
      const result = myReportsScopes(mockUser.id, ['InvalidRole'], false);
      expect(result).toEqual({});
      expect(auditLogger.info).toHaveBeenCalledWith(
        `User: ${mockUser.id} attempting to filter reports with a role: InvalidRole `,
      );
    });

    it('should return an empty object and log a warning when roles are empty', () => {
      jest.spyOn(auditLogger, 'info').mockImplementation(() => {});
      const result = myReportsScopes(mockUser.id, [], false);
      expect(result).toEqual({});
      expect(auditLogger.info).toHaveBeenCalledWith(
        `User: ${mockUser.id} attempting to filter reports with a role:  `,
      );
    });

    it('should return an empty object when roles are undefined', () => {
      jest.spyOn(auditLogger, 'info').mockImplementation(() => {});
      const result = myReportsScopes(mockUser.id, undefined, false);
      expect(result).toEqual({});
      expect(auditLogger.info).toHaveBeenCalledWith(
        `User: ${mockUser.id} attempting to filter reports with a role:  `,
      );
    });
  });

  describe('reportText', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      // Create reports.
      const context1 = 'Nothings gonna change my world';
      const context2 = 'I get by with a little help from my friends';
      const context3 = 'Try thinking more, if just for your own sake';
      includedReport1 = await ActivityReport.create(
        {
          ...draftReport,
          context: context1,
          userId: includedUser1.id,
        },
      );
      includedReport2 = await ActivityReport.create(
        {
          ...draftReport,
          context: context2,
          userId: includedUser2.id,
        },
      );
      excludedReport = await ActivityReport.create(
        {
          ...draftReport,
          context: context3,
          userId: excludedUser.id,
        },
      );
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      // Delete reports.
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
    });

    it('return correct report text filter search results', async () => {
      const filters = { 'reportText.ctn': ['change'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleIds },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id]));
    });

    it('excludes correct report text filter search results', async () => {
      const filters = { 'reportText.nctn': ['change'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleIds },
          ],
        },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          includedReport2.id,
          excludedReport.id,
          globallyExcludedReport.id,
        ]));
    });
  });

  describe('resourceUrl', () => {
    let reportOne;
    let reportTwo;
    let reportOneWasCreated;
    let reportTwoWasCreated;
    let arOneResources;
    let arTwoResources;

    const reportOneUrls = [
      'http://google.com',
      'http://github.com',
      'http://cloud.gov',
      'https://adhocteam.us/',
    ];

    const reportTwoUrls = [
      'http://www.crayola.com',
    ];

    beforeAll(async () => {
      [reportOne, reportOneWasCreated] = await ActivityReport.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          context: '',
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          numberOfParticipants: 1,
          deliveryMethod: 'method',
          duration: 0,
          endDate: '2020-01-01T12:00:00Z',
          startDate: '2020-01-01T12:00:00Z',
          requester: 'requester',
          regionId: 1,
          targetPopulations: [],
          version: 2,
        },
        individualHooks: true,
        raw: true,
      });
      await findOrCreateResources(reportOneUrls);
      arOneResources = await processActivityReportForResourcesById(
        reportOne.id,
        reportOneUrls,
      );

      [reportTwo, reportTwoWasCreated] = await ActivityReport.findOrCreate({
        where: {
          id: 99_999,
        },
        defaults: {
          context: '',
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          numberOfParticipants: 1,
          deliveryMethod: 'method',
          duration: 0,
          endDate: '2020-01-01T12:00:00Z',
          startDate: '2020-01-01T12:00:00Z',
          requester: 'requester',
          regionId: 1,
          targetPopulations: [],
          version: 2,
        },
        individualHooks: true,
        raw: true,
      });
      await findOrCreateResources(reportTwoUrls);
      arTwoResources = await processActivityReportForResourcesById(
        reportTwo.id,
        reportTwoUrls,
      );
    });

    afterAll(async () => {
      await ActivityReportResource.destroy({
        where: { activityReportId: reportOne.id },
        individualHooks: true,
      });
      await ActivityReportResource.destroy({
        where: { activityReportId: reportTwo.id },
        individualHooks: true,
      });
      await Resource.destroy({
        where: { url: { [Op.in]: [...reportOneUrls, ...reportTwoUrls] } },
        individualHooks: true,
      });
      if (reportOneWasCreated) {
        await ActivityReport.destroy({
          where: { id: reportOne.id },
          individualHooks: true,
        });
      }
      if (reportTwoWasCreated) {
        await ActivityReport.destroy({
          where: { id: reportTwo.id },
          individualHooks: true,
        });
      }
    });

    it('returns correct resource url filter search results', async () => {
      const filters = { 'resourceUrl.ctn': ['google'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: [reportOne.id, reportTwo.id] },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportOne.id]));
    });

    it('excludes correct resource url filter search results', async () => {
      const filters = { 'resourceUrl.nctn': ['http'] };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: [reportOne.id, reportTwo.id] },
          ],
        },
      });
      expect(found.length).toBe(0);
    });
  });

  describe('resourceAttachment', () => {
    let recipient;
    let recipientCreated;

    let grant;
    let grantCreated;

    let goal;
    let goalCreated;

    let objective;
    let objectiveCreated;

    let report;
    let reportCreated;

    let aro;
    let aroCreated;

    beforeAll(async () => {
      [recipient, recipientCreated] = await Recipient.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          id: 99_998,
          name: faker.random.alphaNumeric(10),
          uei: faker.datatype.string(12),
        },
        individualHooks: true,
        raw: true,
      });

      [grant, grantCreated] = await Grant.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          number: recipient.id,
          recipientId: recipient.id,
          programSpecialistName: faker.name.firstName(),
          regionId: 1,
          id: 99_998,
        },
        individualHooks: true,
        raw: true,
      });

      [goal, goalCreated] = await Goal.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          id: 99_998,
          grantId: grant.id,
          status: 'In Progress',
          name: faker.random.alphaNumeric(10),
          isFromSmartsheetTtaPlan: false,
        },
        individualHooks: true,
        raw: true,
      });

      [objective, objectiveCreated] = await Objective.findOrCreate({
        where: {
          id: 99_998,
        },
        individualHooks: true,
        raw: true,
      });

      [report, reportCreated] = await ActivityReport.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          context: '',
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          numberOfParticipants: 1,
          deliveryMethod: 'method',
          duration: 0,
          endDate: '2020-01-01T12:00:00Z',
          startDate: '2020-01-01T12:00:00Z',
          requester: 'requester',
          regionId: 1,
          targetPopulations: [],
          version: 2,
        },
        individualHooks: true,
        raw: true,
      });

      [aro, aroCreated] = await ActivityReportObjective.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          id: 99_998,
          activityReportId: 99_998,
          objectiveId: objective.id,
        },
        individualHooks: true,
        raw: true,
      });

      await createActivityReportObjectiveFileMetaData(
        'test.pdf',
        'very-unique-file-key',
        [aro.id],
        12_345,
      );
    });

    afterAll(async () => {
      if (aroCreated) {
        await ActivityReportObjective.destroy({
          where: { id: aro.id },
          individualHooks: true,
        });
      }

      if (reportCreated) {
        await ActivityReport.destroy({
          where: { id: report.id },
          individualHooks: true,
        });
      }

      if (objectiveCreated) {
        await Objective.destroy({
          where: { id: objective.id },
          individualHooks: true,
          force: true,
        });
      }

      if (goalCreated) {
        await Goal.destroy({
          where: { id: goal.id },
          individualHooks: true,
          force: true,
        });
      }

      if (grantCreated) {
        await Grant.destroy({
          where: { id: grant.id },
          individualHooks: true,
        });
      }

      if (recipientCreated) {
        await Recipient.destroy({
          where: { id: recipient.id },
          individualHooks: true,
        });
      }
    });

    it('returns correct resource attachment filter search results', async () => {
      const filters = { 'resourceAttachment.ctn': ['test'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: [report.id] },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([report.id]));
    });

    it('excludes correct resource attachment filter search results', async () => {
      const filters = { 'resourceAttachment.nctn': ['test'] };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: [report.id] },
          ],
        },
      });
      expect(found.length).toBe(0);
    });
  });

  describe('defaultScope', () => {
    it('excludes deleted reports', async () => {
      const beginningARCount = await ActivityReport.count();
      const deleted = await ActivityReport.create(deletedReport);
      expect(deleted.id).toBeDefined();
      const endARCount = await ActivityReport.count();
      expect(endARCount).toEqual(beginningARCount);
    });
  });

  describe('stateCode', () => {
    let reportOne;
    let reportTwo;
    let reportThree;
    let possibleIds;

    beforeAll(async () => {
      const grantOne = await createGrant({
        stateCode: 'KS',
      });

      const grantTwo = await createGrant({
        stateCode: 'MO',
      });

      reportOne = await createReport({
        id: faker.datatype.number(),
        activityRecipients: [
          {
            grantId: grantOne.id,
          },
        ],
      });
      reportTwo = await createReport({
        id: faker.datatype.number(),
        activityRecipients: [
          {
            grantId: grantOne.id,
          },
          {
            grantId: grantTwo.id,
          },
        ],
      });
      reportThree = await createReport({
        id: faker.datatype.number(),
        activityRecipients: [
          {
            grantId: grantTwo.id,
          },
        ],
      });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await destroyReport(reportOne);
      await destroyReport(reportTwo);
      await destroyReport(reportThree);
    });

    it('includes reports with grants with the given state code', async () => {
      const filters = { 'stateCode.ctn': ['KS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });
  });

  describe('createDate', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create({ ...draftReport, id: 95825, createdAt: '2019-01-01T21:00:57.149Z' });
      secondReport = await ActivityReport.create({ ...draftReport, id: 95852, createdAt: '2020-02-01T21:11:57.149Z' });
      thirdReport = await ActivityReport.create({ ...draftReport, id: 95857, createdAt: '2021-01-01T21:14:57.149Z' });
      fourthReport = await ActivityReport.create({ ...draftReport, id: 95827, createdAt: '2023-01-01T21:15:57.149Z' });
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with create dates before the given date', async () => {
      const filters = { 'createDate.bef': '2020/12/31' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id]));
    });

    it('after returns reports with create dates after the given date', async () => {
      const filters = { 'createDate.aft': '2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([fourthReport.id]));
    });

    it('within returns reports with create dates between the two dates', async () => {
      const filters = { 'createDate.win': '2020/01/01-2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });
  });

  describe('endDate', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create(
        { ...draftReport, id: 95842, endDate: new Date(2020, 8, 1) },
      );
      secondReport = await ActivityReport.create(
        { ...draftReport, id: 95843, endDate: new Date(2020, 8, 2) },
      );
      thirdReport = await ActivityReport.create(
        { ...draftReport, id: 95844, endDate: new Date(2020, 8, 3) },
      );
      fourthReport = await ActivityReport.create(
        { ...draftReport, id: 95845, endDate: new Date(2020, 8, 4) },
      );
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with end dates before the given date', async () => {
      const filters = { 'endDate.bef': '2020/09/02' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id]));
    });

    it('after returns reports with end dates after the given date', async () => {
      const filters = { 'endDate.aft': '2020/09/04' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([fourthReport.id]));
    });

    it('within returns reports with create dates between the two dates', async () => {
      const filters = { 'endDate.win': '2020/09/01-2020/09/03' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id, thirdReport.id]));
    });

    it('in returns reports with end dates between the two dates', async () => {
      const filters = { 'endDate.in': '2020/09/01-2020/09/03' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id, thirdReport.id]));
    });
  });

  describe('region id', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({ ...draftReport, regionId: 2 });
      includedReport2 = await ActivityReport.create({ ...draftReport, regionId: 2 });
      excludedReport = await ActivityReport.create({ ...draftReport, regionId: 3 });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
    });
  });

  describe('delivery method', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({ ...draftReport, deliveryMethod: 'in-person' });
      includedReport2 = await ActivityReport.create({ ...draftReport, deliveryMethod: 'in-person' });
      excludedReport = await ActivityReport.create({ ...draftReport, deliveryMethod: 'hybrid' });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
    });

    describe('formatDeliveryMethod', () => {
      it('returns in-person for "in person"', () => {
        expect(formatDeliveryMethod('in person')).toBe('in-person');
      });
    });

    it('includes delivery method', async () => {
      const filters = { 'deliveryMethod.in': ['in-person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('includes multiple delivery methods', async () => {
      const filters = { 'deliveryMethod.in': ['in-person', 'hybrid'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          includedReport1.id,
          includedReport2.id,
          excludedReport.id,
        ]));
    });

    it('excludes delivery method', async () => {
      const filters = { 'deliveryMethod.nin': ['in-person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcludedReport.id]));
    });

    it('excludes multiple delivery method', async () => {
      const filters = { 'deliveryMethod.nin': ['in-person', 'hybrid'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([globallyExcludedReport.id]));
    });
  });

  describe('only other entities', () => {
    let reportIncluded1;
    let reportExcluded;
    let reportIncluded2;

    let otherEntityIncluded1;
    let otherEntityIncluded2;
    let otherEntityExcluded;

    let possibleIds;

    beforeAll(async () => {
      otherEntityIncluded1 = await OtherEntity.create({ id: 25458, name: 'Head Start Collaboration Office' });
      otherEntityExcluded = await OtherEntity.create({ id: 25459, name: 'QRIS System' });
      otherEntityIncluded2 = await OtherEntity.create({ id: 25460, name: 'State CCR&R' });

      reportIncluded1 = await ActivityReport.create(
        { userId: mockUser.id, ...draftReport },
      );
      reportIncluded2 = await ActivityReport.create(
        { userId: mockUser.id, ...draftReport },
      );
      reportExcluded = await ActivityReport.create(
        { userId: mockUser.id, ...draftReport },
      );

      await ActivityRecipient.create({
        activityReportId: reportIncluded1.id,
        otherEntityId: otherEntityIncluded1.id,
      });
      await ActivityRecipient.create({
        activityReportId: reportExcluded.id,
        otherEntityId: otherEntityExcluded.id,
      });
      await ActivityRecipient.create({
        activityReportId: reportIncluded2.id,
        otherEntityId: otherEntityIncluded2.id,
      });

      possibleIds = [
        reportIncluded1.id,
        reportIncluded2.id,
        reportExcluded.id,
        globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
        },
      });
      await ActivityReport.destroy({
        where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
      });
      await OtherEntity.destroy({
        where: { id: [otherEntityIncluded1.id, otherEntityIncluded2.id, otherEntityExcluded.id] },
      });
    });

    it('includes other entities', async () => {
      const filters = { 'otherEntities.in': ['Head Start Collaboration Office', 'State CCR&R'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
    });

    it('excludes other entities', async () => {
      const filters = { 'otherEntities.nin': ['Head Start Collaboration Office', 'State CCR&R'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcludedReport.id]));
    });
  });

  describe('goalName', () => {
    let includedReport;
    let excludedReport;
    let possibleIds;

    let recipient;
    let grant;

    let goalOne;
    let goalTwo;

    const includedGoalName = `${faker.lorem.sentence(10)}chowder`;
    const excludedGoalName = `${faker.lorem.sentence(10)}hams`;

    beforeAll(async () => {
      recipient = await createRecipient();
      grant = await createGrant({ recipientId: recipient.id });

      goalOne = await createGoal({
        grantId: grant.id, name: includedGoalName, status: GOAL_STATUS.IN_PROGRESS,
      });
      goalTwo = await createGoal({
        grantId: grant.id, name: excludedGoalName, status: GOAL_STATUS.IN_PROGRESS,
      });

      // Create reports.
      includedReport = await ActivityReport.create(
        {
          ...draftReport,
          userId: includedUser1.id,
        },
      );

      await ActivityReportGoal.create({
        activityReportId: includedReport.id,
        goalId: goalOne.id,
        name: goalOne.name,
        status: goalOne.status,
      });

      excludedReport = await ActivityReport.create(
        {
          ...draftReport,
          userId: excludedUser.id,
        },
      );

      await ActivityReportGoal.create({
        activityReportId: excludedReport.id,
        goalId: goalTwo.id,
        name: goalTwo.name,
        status: goalTwo.status,
      });

      possibleIds = [
        includedReport.id,
        excludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReportGoal.destroy({
        where: {
          activityReportId: [includedReport.id, excludedReport.id],
        },
      });

      // Delete reports.
      await ActivityReport.destroy({
        where: { id: [includedReport.id, excludedReport.id] },
      });

      await Goal.destroy({
        where: { id: [goalOne.id, goalTwo.id] },
        force: true,
      });

      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      });

      await Recipient.destroy({
        where: { id: recipient.id },
      });
    });

    it('return correct goal name filter search results', async () => {
      const filters = { 'goalName.ctn': ['chowder'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleIds },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport.id]));
    });

    it('excludes correct goal name filter search results', async () => {
      const filters = { 'goalName.nctn': ['chowder'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleIds },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          excludedReport.id,
        ]));
    });
  });

  describe('grantStatus', () => {
    let cdiReportActive;
    let cdiReportInactive;
    let nonCdiReportActive;
    let nonCdiReportInactive;
    let activeCdiGrant;
    let inactiveCdiGrant;
    let nonCdiGrantActive;
    let nonCdiGrantInactive;
    let reportIds;

    beforeAll(async () => {
      // Grants.
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

      nonCdiGrantActive = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: false,
      });

      nonCdiGrantInactive = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Inactive',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: false,
      });

      // Activity Report.
      cdiReportActive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true });

      cdiReportInactive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true });

      nonCdiReportActive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true });

      nonCdiReportInactive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true });

      reportIds = [
        cdiReportActive.id,
        cdiReportInactive.id,
        nonCdiReportActive.id,
        nonCdiReportInactive.id];

      // Activity Recipients.
      await ActivityRecipient.create({
        activityReportId: cdiReportActive.id,
        grantId: activeCdiGrant.id,
      });

      await ActivityRecipient.create({
        activityReportId: cdiReportInactive.id,
        grantId: inactiveCdiGrant.id,
      });

      await ActivityRecipient.create({
        activityReportId: nonCdiReportActive.id,
        grantId: nonCdiGrantActive.id,
      });

      await ActivityRecipient.create({
        activityReportId: nonCdiReportInactive.id,
        grantId: nonCdiGrantInactive.id,
      });
    });

    afterAll(async () => {
      // Clean up ActivityRecipients.
      await ActivityRecipient.destroy({
        where: {
          activityReportId: reportIds,
        },
      });

      // Clean up ActivityReport.
      await ActivityReport.destroy({
        where: { id: reportIds },
      });

      // Clean up Grants.
      await Grant.destroy({
        where: { id: reportIds },
      });

      // Clean up Recipients.
      await Recipient.destroy({
        where: {
          id: [
            activeCdiGrant.recipientId,
            inactiveCdiGrant.recipientId,
            nonCdiGrantActive.recipientId,
            nonCdiGrantInactive.recipientId,
          ],
        },
      });
    });

    it('includes reports with Active grants', async () => {
      const filters = { 'grantStatus.in': 'active' };
      const { activityReport: scope } = await filtersToScopes(filters);

      // eslint-disable-next-line max-len
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, {
            id: reportIds,
          }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(nonCdiReportActive.id)).toBe(true);
    });

    it('doesn\'t include reports with Active grants', async () => {
      const filters = { 'grantStatus.nin': 'active' };
      const { activityReport: scope } = await filtersToScopes(filters);

      // eslint-disable-next-line max-len
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, {
            id: reportIds,
          }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(nonCdiReportInactive.id)).toBe(true);
    });

    it('includes reports with Inactive grants', async () => {
      const filters = { 'grantStatus.in': 'inactive' };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, {
            id: reportIds,
          }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(nonCdiReportInactive.id)).toBe(true);
    });

    it('doesn\'t include reports with Inactive grants', async () => {
      //
      const filters = { 'grantStatus.nin': 'inactive' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, {
            id: reportIds,
          }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(nonCdiReportActive.id)).toBe(true);
    });

    it('includes reports with CDI grants', async () => {
      const filters = { 'grantStatus.in': 'cdi' };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, {
            id: reportIds,
          }],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id).includes(cdiReportActive.id)).toBe(true);
    });

    it('doesn\'t include reports with NonCDI grants', async () => {
      const filters = { 'grantStatus.nin': 'cdi' };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, {
            id: reportIds,
          }],
        },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id).includes(nonCdiReportActive.id)).toBe(true);
      expect(found.map((f) => f.id).includes(nonCdiReportInactive.id)).toBe(true);
    });
  });
});
