// import { Op } from 'sequelize';
import db, {
  ActivityReport, Collaborator, ActivityRecipient, User,
  Recipient, OtherEntity, Grant, NextStep, Region, Permission, Role, UserRole,
} from '../models';
import {
  createOrUpdate,
  activityReportAndRecipientsById,
  possibleRecipients,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReports,
  getAllDownloadableActivityReportAlerts,
  setStatus,
  batchQuery,
  formatResources,
} from './activityReports';
import SCOPES from '../middleware/scopeConstants';
import {
  APPROVER_STATUSES,
  REPORT_STATUSES,
  ENTITY_TYPES,
  RATIFIER_STATUSES,
} from '../constants';
import {
  upsertRatifier,
  removeRatifier,
  upsertEditor,
  syncOwnerInstantiators,
} from './collaborators';
import { createReport, destroyReport } from '../testUtils';
import { auditLogger } from '../logger';

const RECIPIENT_ID = 30;
const RECIPIENT_ID_SORTING = 31;
const ALERT_RECIPIENT_ID = 345;

const mockUser = {
  id: 1115665161,
  homeRegionId: 1,
  name: 'user1115665161',
  hsesUsername: 'user1115665161',
  hsesUserId: 'user1115665161',
};

const mockUserTwo = {
  id: 265157914,
  homeRegionId: 1,
  name: 'user265157914',
  hsesUserId: 'user265157914',
  hsesUsername: 'user265157914',
};

const mockUserThree = {
  id: 39861962,
  homeRegionId: 1,
  name: 'user39861962',
  hsesUserId: 'user39861962',
  hsesUsername: 'user39861962',
};

const mockUserFour = {
  id: 49861962,
  homeRegionId: 1,
  name: 'user49861962',
  hsesUserId: 'user49861962',
  hsesUsername: 'user49861962',
};

const mockUserFive = {
  id: 55861962,
  homeRegionId: 1,
  name: 'user55861962',
  hsesUserId: 'user55861962',
  hsesUsername: 'user55861962',

};

const alertsMockUserOne = {
  id: 16465416,
  homeRegionId: 1,
  name: 'a',
  hsesUserId: 'a',
  hsesUsername: 'a',
};

const alertsMockUserTwo = {
  id: 21161130,
  homeRegionId: 1,
  name: 'b',
  hsesUserId: 'b',
  hsesUsername: 'b',
  role: [],
};

const reportObject = {
  owner: { userId: mockUser.id },
  approval: {
    submissionStatus: REPORT_STATUSES.DRAFT,
  },
  activityRecipientType: 'recipient',
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: RECIPIENT_ID }],
};

const submittedReport = {
  ...reportObject,
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
  },
  activityRecipients: [{ grantId: 1 }],
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

describe('formatResources', () => {
  it('skips empties', () => {
    const resources = ['', 'a'];
    const result = formatResources(resources);

    expect(result).toStrictEqual(['a']);
  });

  it('handles objects with an empty value', () => {
    const resources = ['', 'a', { value: '' }];
    const result = formatResources(resources);
    expect(result).toStrictEqual(['a']);
  });

  it('handles multiple types of data thrown at it', () => {
    const resources = ['', 'a', { value: '' }, { value: 'c' }, 'b', null];
    const result = formatResources(resources);
    expect(result).toStrictEqual(['a', 'c', 'b']);
  });
});

describe('Activity report service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('Retrieve Alerts', () => {
    beforeAll(async () => {
      await Promise.all([
        User.bulkCreate([
          mockUserFour,
          mockUserFive,
        ], { validate: true, individualHooks: true }),
        OtherEntity.create({ id: ALERT_RECIPIENT_ID, name: 'alert otherEntity' }),
        Recipient.create({ name: 'alert recipient', id: ALERT_RECIPIENT_ID, uei: 'NNA5N2KHMGN2' }),
        Region.create({ name: 'office 22', id: 22 }),
      ]);
      await Grant.create({
        id: ALERT_RECIPIENT_ID, number: 1, recipientId: ALERT_RECIPIENT_ID, regionId: 22, status: 'Active',
      });
    });

    afterAll(async () => {
      const userIds = [
        mockUserFour.id,
        mockUserFive.id];
      const reports = await ActivityReport.findAll({
        include: [{
          model: Collaborator,
          as: 'owner',
          where: { userId: userIds },
          required: true,
        }],
      });
      const reportIds = reports.map((report) => report.id);
      await NextStep.destroy({ where: { activityReportId: reportIds } });
      await ActivityRecipient.destroy({ where: { activityReportId: reportIds } });
      await ActivityReport.destroy({ where: { id: reportIds } });
      await User.destroy({ where: { id: userIds } });
      await Permission.destroy({ where: { userId: userIds } });
      await OtherEntity.destroy({ where: { id: ALERT_RECIPIENT_ID } });
      await Grant.destroy({ where: { recipientId: [ALERT_RECIPIENT_ID] } });
      await Recipient.destroy({ where: { id: [ALERT_RECIPIENT_ID] } });
      await Region.destroy({ where: { id: 22 } });
    });

    it('retrieves myalerts', async () => {
      // Add User Permissions.
      await Permission.create({
        userId: mockUserFour.id,
        regionId: 1,
        scopeId: SCOPES.READ_REPORTS,
      });

      await Permission.create({
        userId: mockUserFive.id,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      });

      // In Draft.
      await createOrUpdate({
        ...reportObject,
        lastUpdatedById: mockUserFour.id,
        approval: {
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
        },
        owner: { userId: mockUserFour.id },
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Submitted.
      await createOrUpdate({
        ...submittedReport,
        lastUpdatedById: mockUserFour.id,
        owner: { userId: mockUserFour.id },
        approval: {
          submissionStatus: REPORT_STATUSES.SUBMITTED,
          calculatedStatus: REPORT_STATUSES.SUBMITTED,
        },
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Needs Action.
      await createOrUpdate({
        ...submittedReport,
        lastUpdatedById: mockUserFour.id,
        owner: { userId: mockUserFour.id },
        approval: {
          submissionStatus: REPORT_STATUSES.SUBMITTED,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        },
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Approved (Should be missing).
      await createOrUpdate({
        ...submittedReport,
        lastUpdatedById: mockUserFour.id,
        owner: { userId: mockUserFour.id },
        approval: {
          submissionStatus: REPORT_STATUSES.SUBMITTED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Is Only Approver.
      await createOrUpdate({
        ...submittedReport,
        lastUpdatedById: mockUserFive.id,
        owner: { userId: mockUserFive.id },
        approvers: [{ userId: mockUserFour.id }],
        approval: {
          submissionStatus: REPORT_STATUSES.SUBMITTED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Is Only Collaborator
      await createOrUpdate({
        ...submittedReport,
        lastUpdatedById: mockUserFive.id,
        owner: { userId: mockUserFive.id },
        collaborators: [{ userId: mockUserFour.id }],
        approval: {
          submissionStatus: REPORT_STATUSES.SUBMITTED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      const { count, rows } = await activityReportAlerts(mockUserFour.id, {});
      expect(count).toBe(5);

      const counter = rows.reduce((prev, curr) => {
        const val = prev[curr.userId];

        return {
          ...prev,
          [curr.userId]: val + 1,
        };
      }, {
        [mockUserFour.id]: 0,
        [mockUserFive.id]: 0,
      });

      expect(counter[mockUserFour.id]).toBe(3);
      expect(counter[mockUserFive.id]).toBe(2);
    });
  });

  const idsToExclude = [9999, 777, 778, 779];

  describe('Activity Reports DB service', () => {
    beforeAll(async () => {
      await Promise.all([
        User.bulkCreate([
          mockUser,
          mockUserTwo,
          mockUserThree,
          alertsMockUserOne,
          alertsMockUserTwo,
        ], { validate: true, individualHooks: true }),
        OtherEntity.create({ id: RECIPIENT_ID, name: 'otherEntity' }),
        Recipient.findOrCreate({ where: { name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGA2' } }),
        Region.create({ name: 'office 19', id: 19 }),
      ]);

      const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } });
      const healthSpecialist = await Role.findOne({ where: { fullName: 'Health Specialist' } });
      const cor = await Role.findOne({ where: { fullName: 'COR' } });

      await UserRole.create({
        userId: mockUser.id,
        roleId: grantsSpecialist.id,
      });

      await UserRole.create({
        userId: mockUser.id,
        roleId: healthSpecialist.id,
      });

      await UserRole.create({
        userId: mockUserTwo.id,
        roleId: cor.id,
      });

      await Grant.create({
        id: RECIPIENT_ID, number: 1, recipientId: RECIPIENT_ID, regionId: 19, status: 'Active',
      });
    });

    afterAll(async () => {
      const userIds = [
        mockUser.id,
        mockUserTwo.id,
        mockUserThree.id,
        alertsMockUserOne.id,
        alertsMockUserTwo.id,
        mockUserFour.id,
        mockUserFive.id];
      const reports = await ActivityReport.findAll({
        include: [{
          model: Collaborator,
          as: 'owner',
          where: { userId: userIds },
          required: true,
        }],
      });
      const reportIds = reports.map((report) => report.id);
      await NextStep.destroy({ where: { activityReportId: reportIds } });
      await ActivityRecipient.destroy({ where: { activityReportId: reportIds } });
      await ActivityReport.destroy({ where: { id: reportIds } });
      await UserRole.destroy({ where: { userId: userIds } });
      await User.destroy({ where: { id: userIds } });
      await Permission.destroy({ where: { userId: userIds } });
      await OtherEntity.destroy({ where: { id: RECIPIENT_ID } });
      await Grant.destroy({ where: { id: [RECIPIENT_ID, RECIPIENT_ID_SORTING] } });
      await Recipient.destroy({ where: { id: [RECIPIENT_ID, RECIPIENT_ID_SORTING] } });
      await Region.destroy({ where: { id: 19 } });
    });

    describe('createOrUpdate', () => {
      it('updates an already saved report', async () => {
        const report = await createOrUpdate({ ...reportObject, id: 3334 });
        await createOrUpdate({ ...report, ECLKCResourcesUsed: [{ value: 'updated' }] }, report);
        expect(report.activityRecipientType).toEqual('recipient');
        expect(report.calculatedStatus).toEqual('draft');
        expect(report.ECLKCResourcesUsed).toEqual(['updated']);
        expect(report.id).toEqual(3334);
      });

      it('creates a report with no recipient type', async () => {
        const emptyReport = {
          ECLKCResourcesUsed: [{ value: '' }],
          activityRecipientType: null,
          activityRecipients: [],
          activityType: [],
          additionalNotes: null,
          approvingManagerId: null,
          attachments: [],
          activityReportCollaborators: [],
          context: '',
          deliveryMethod: null,
          duration: null,
          endDate: null,
          goals: [],
          recipientNextSteps: [],
          recipients: [],
          nonECLKCResourcesUsed: [{ value: '' }],
          numberOfParticipants: null,
          objectivesWithoutGoals: [],
          otherResources: [],
          participantCategory: '',
          participants: [],
          reason: [],
          requester: null,
          specialistNextSteps: [],
          startDate: null,
          submissionStatus: REPORT_STATUSES.DRAFT,
          targetPopulations: [],
          topics: [],
          pageState: {
            1: 'Not Started',
            2: 'Not Started',
            3: 'Not Started',
            4: 'Not Started',
          },
          userId: mockUser.id,
          regionId: 1,
          ttaType: [],
          lastUpdatedById: 1,
        };

        const report = await createOrUpdate(emptyReport);
        expect(report.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
      });

      it('creates a new report', async () => {
        const beginningARCount = await ActivityReport.findAll({
          include: [{
            model: Collaborator,
            as: 'owner',
            where: { userId: mockUser.id },
            required: true,
          }],
        });
        const report = await createOrUpdate(reportObject);
        const endARCount = await ActivityReport.findAll({
          include: [{
            model: Collaborator,
            as: 'owner',
            where: { userId: mockUser.id },
            required: true,
          }],
        });
        expect(endARCount.length - beginningARCount.length).toBe(1);
        expect(report.activityRecipients[0].id).toBe(RECIPIENT_ID);
        // Check afterCreate copySubmissionStatus hook
        expect(report.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
      });

      it('creates a new report with other-entity recipient', async () => {
        const report = await createOrUpdate({ ...reportObject, activityRecipientType: 'other-entity' });
        expect(report.activityRecipients[0].id).toBe(RECIPIENT_ID);
      });

      it('handles reports with collaborators', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          collaborators: [{ user: { id: mockUser.id } }],
        });
        expect(report.collaborators.length).toBe(1);
        expect(report.collaborators[0].user.name).toBe(mockUser.name);
      });

      it('creates a new report and sets collaborator roles', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          collaborators: [
            { user: { id: mockUser.id } },
            { user: { id: mockUserTwo.id } },
            { user: { id: mockUserThree.id } },
          ],
        });

        expect(report.collaborators.length).toBe(3);

        // Mock User 1.
        let collaborator = report.collaborators.filter(
          (u) => u.user.name === mockUser.name,
        );
        expect(collaborator).not.toBe(null);
        expect(collaborator.length).toBe(1);
        expect(collaborator[0].collaboratorRoles.length).toBe(2);
        collaborator[0].collaboratorRoles.sort(
          (a, b) => ((a.role > b.role) ? 1 : -1),
        );
        expect(collaborator[0].fullName).toBe('user1115665161, GS, HS');
        expect(collaborator[0].collaboratorRoles.map((r) => r.fullName)).toContain('Grants Specialist');
        expect(collaborator[0].collaboratorRoles.map((r) => r.fullName)).toContain('Health Specialist');

        // Mock User 2.
        collaborator = report.collaborators.filter(
          (c) => c.user.name === mockUserTwo.name,
        );
        expect(collaborator).not.toBe(null);
        expect(collaborator.length).toBe(1);
        expect(collaborator[0].fullName).toBe('user265157914, COR');
        expect(collaborator[0].collaboratorRoles.length).toBe(1);
        expect(collaborator[0].collaboratorRoles[0].fullName).toBe('COR');

        // Mock User 3.
        collaborator = report.collaborators.filter(
          (c) => c.user.name === mockUserThree.name,
        );
        expect(collaborator).not.toBe(null);
        expect(collaborator.length).toBe(1);
        expect(collaborator[0].fullName).toBe('user39861962');
        expect(collaborator[0].collaboratorRoles.length).toBe(0);
      });

      it('updates collaborator roles on a already saved report', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          id: 3438,
          collaborators: [
            { user: { id: mockUserTwo.id } },
            { user: { id: mockUserThree.id } }, // Missing role.
          ],
        });

        const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } });

        await UserRole.create({
          roleId: systemSpecialist.id,
          userId: mockUserThree.id,
        });

        const updatedReport = await createOrUpdate(
          {
            ...report,
            // Remove collaborator 2.
            collaborators: [
              { user: { id: mockUser.id } },
              { user: { id: mockUserThree.id } },
            ],
          },
          report,
        );
        expect(updatedReport.collaborators.length).toBe(2);

        // Mock User 1.
        let collaborator = updatedReport.collaborators.filter(
          (u) => u.user.name === mockUser.name,
        );
        expect(collaborator).not.toBe(null);
        expect(collaborator.length).toBe(1);
        expect(collaborator[0].collaboratorRoles.length).toBe(2);
        collaborator[0].roles.sort(
          (a, b) => ((a.role > b.role) ? 1 : -1),
        );
        expect(collaborator[0].collaboratorRoles.map((r) => r.fullName)).toContain('Grants Specialist');
        expect(collaborator[0].collaboratorRoles.map((r) => r.fullName)).toContain('Health Specialist');

        // Mock User 3.
        collaborator = updatedReport.collaborators.filter(
          (c) => c.user.name === mockUserThree.name,
        );
        expect(collaborator).not.toBe(null);
        expect(collaborator.length).toBe(1);
        expect(collaborator[0].roles.length).toBe(1);
        expect(collaborator[0].roles[0].fullName).toBe('System Specialist'); // Updated role.
      });

      it('handles notes being created', async () => {
        // Given an report with some notes
        const reportObjectWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot', completeDate: '2022-05-31T12:00:00Z' }, { note: 'harry', completeDate: '2022-06-10T12:00:00Z' }],
          recipientNextSteps: [{ note: 'One Piece', completeDate: '2022-06-02T12:00:00Z' }, { note: 'Toy Story', completeDate: '2022-06-22T12:00:00Z' }],
        };
        // When that report is created
        let report;
        try {
          report = await createOrUpdate(reportObjectWithNotes);
        } catch (err) {
          auditLogger.error(err);
          throw err;
        }
        // Then we see that it was saved correctly
        expect(report.specialistNextSteps.length).toBe(2);
        expect(report.recipientNextSteps.length).toBe(2);
        expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
        expect(report.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['05/31/2022', '06/10/2022']));
        expect(report.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
        expect(report.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/02/2022', '06/22/2022']));
      });

      it('handles specialist notes being created', async () => {
        // Given a report with specliasts notes
        // And no recipient notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot', completeDate: '2022-05-31T12:00:00Z' }, { note: 'harry', completeDate: '2022-06-10T12:00:00Z' }],
          recipientNextSteps: [],
        };

        // When that report is created
        let report;
        try {
          report = await createOrUpdate(reportWithNotes);
        } catch (err) {
          auditLogger.error(err);
          throw err;
        }

        // Then we see that it was saved correctly
        expect(report.recipientNextSteps.length).toBe(0);
        expect(report.specialistNextSteps.length).toBe(2);
        expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
        expect(report.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['05/31/2022', '06/10/2022']));
      });

      it('handles recipient notes being created', async () => {
        // Given a report with recipient notes
        // And not specialist notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [],
          recipientNextSteps: [{ note: 'One Piece', completeDate: '2022-06-02T12:00:00Z' }, { note: 'Toy Story', completeDate: '2022-06-22T12:00:00Z' }],
        };

        // When that report is created
        let report;
        try {
          report = await createOrUpdate(reportWithNotes);
        } catch (err) {
          auditLogger.error(err);
          throw err;
        }

        // Then we see that it was saved correctly
        expect(report.specialistNextSteps.length).toBe(0);
        expect(report.recipientNextSteps.length).toBe(2);
        expect(report.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
        expect(report.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/02/2022', '06/22/2022']));
      });

      it('handles specialist notes being updated', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot', completeDate: '2022-06-01T12:00:00Z' }, { note: 'harry', completeDate: '2022-06-02T12:00:00Z' }],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };
        const report = await createOrUpdate(reportWithNotes);

        // When the report is updated with new set of specialist notes
        const notes = { specialistNextSteps: [{ note: 'harry', completeDate: '2022-06-04T12:00:00Z' }, { note: 'spongebob', completeDate: '2022-06-06T12:00:00Z' }] };
        const updatedReport = await createOrUpdate(notes, report);

        // Then we see it was updated correctly
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.specialistNextSteps.map((n) => n.note))
          .toEqual(expect.arrayContaining(['harry', 'spongebob']));
        expect(updatedReport.specialistNextSteps.map((n) => n.completeDate))
          .toEqual(expect.arrayContaining(['06/04/2022', '06/06/2022']));
      });

      it('handles recipient notes being updated', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [{ note: 'One Piece', completeDate: '2022-06-01T12:00:00Z' }, { note: 'Toy Story', completeDate: '2022-06-02T12:00:00Z' }],
        };
        const report = await createOrUpdate(reportWithNotes);

        // When the report is updated with new set of recipient notes
        const notes = { recipientNextSteps: [{ note: 'One Piece', completeDate: '2022-06-04T12:00:00Z' }, { note: 'spongebob', completeDate: '2022-06-06T12:00:00Z' }] };
        const updatedReport = await createOrUpdate(notes, report);

        // Then we see it was updated correctly
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.recipientNextSteps.map((n) => n.note))
          .toEqual(expect.arrayContaining(['One Piece', 'spongebob']));
        expect(updatedReport.recipientNextSteps.map((n) => n.completeDate))
          .toEqual(expect.arrayContaining(['06/04/2022', '06/06/2022']));
      });

      it('handles notes being updated to empty', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot', completeDate: '2022-06-01T12:00:00Z' }, { note: 'harry', completeDate: '2022-06-02T12:00:00Z' }],
          recipientNextSteps: [{ note: 'One Piece', completeDate: '2022-06-03T12:00:00Z' }, { note: 'Toy Story', completeDate: '2022-06-04T12:00:00Z' }],
        };
        const report = await createOrUpdate(reportWithNotes);

        // When the report is updated with empty notes
        const notes = {
          recipientNextSteps: [],
          specialistNextSteps: [],
        };
        const updatedReport = await createOrUpdate(notes, report);

        // Then we see the report was updated correctly
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.recipientNextSteps.length).toBe(0);
        expect(updatedReport.specialistNextSteps.length).toBe(0);
      });

      it('handles notes being the same', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot', completeDate: '2022-06-01T12:00:00Z' }, { note: 'harry', completeDate: '2022-06-02T12:00:00Z' }],
          recipientNextSteps: [{ note: 'One Piece', completeDate: '2022-06-03T12:00:00Z' }, { note: 'Toy Story', completeDate: '2022-06-04T12:00:00Z' }],
        };
        const report = await createOrUpdate(reportWithNotes);
        const recipientIds = report.recipientNextSteps.map((note) => note.id);
        const specialistsIds = report.specialistNextSteps.map((note) => note.id);

        const [freshlyUpdated] = await activityReportAndRecipientsById(report.id);

        // When the report is updated with same notes
        const notes = {
          specialistNextSteps: report.specialistNextSteps,
          recipientNextSteps: report.recipientNextSteps,
        };
        const updatedReport = await createOrUpdate(notes, freshlyUpdated);

        // Then we see nothing changes
        // And we are re-using the same old ids
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
        expect(updatedReport.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/03/2022', '06/04/2022']));
        expect(updatedReport.recipientNextSteps.map((n) => n.id))
          .toEqual(expect.arrayContaining(recipientIds));

        expect(updatedReport.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
        expect(updatedReport.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/01/2022', '06/02/2022']));
        expect(updatedReport.specialistNextSteps.map((n) => n.id))
          .toEqual(expect.arrayContaining(specialistsIds));
      });

      it('calls syncApprovers appropriately', async () => {
        const reportWithApprovers = {
          ...reportObject,
          approverUserIds: [mockUserTwo.id],
        };
        // Calls syncApprovers when approverUserIds is present
        const newReport = await createOrUpdate(reportWithApprovers);
        expect(newReport.approvers[0].User.id).toEqual(mockUserTwo.id);

        const [report] = await activityReportAndRecipientsById(newReport.id);

        // When syncApprovers is undefined, skip call, avoid removing approvers
        const reportTwo = await createOrUpdate({ ...reportObject, regionId: 3 }, report);
        expect(reportTwo.approvers[0].User.id).toEqual(mockUserTwo.id);
        expect(reportTwo.regionId).toEqual(3);
      });
    });

    describe('activityReportByLegacyId', () => {
      it('returns the report with the legacyId', async () => {
        const report = await createOrUpdate({ ...reportObject, legacyId: 'legacy' });
        const found = await activityReportByLegacyId('legacy');
        expect(found.id).toBe(report.id);
      });
    });

    describe('activityReportAndRecipientsById', () => {
      it('retrieves an activity report', async () => {
        const report = await createOrUpdate(reportObject);

        const [foundReport] = await activityReportAndRecipientsById(report.id);
        expect(foundReport.id).toBe(report.id);
        expect(foundReport.ECLKCResourcesUsed).toEqual(['test']);
      });
      it('includes approver with full name', async () => {
        const report = await createOrUpdate({
          ...submittedReport,
          regionId: 5,
          approvers: [{
            userId: mockUserTwo.id,
            status: APPROVER_STATUSES.APPROVED,
            note: 'great job from user 2',
          }],
        });
        const [foundReport] = await activityReportAndRecipientsById(report.id);
        expect(foundReport.approvers[0].User.get('fullName')).toEqual(`${mockUserTwo.name}, COR`);
      });
      it('excludes soft deleted approvers', async () => {
        // To include deleted approvers in future add paranoid: false
        // attribute to include object for ActivityReportApprover
        // https://sequelize.org/master/manual/paranoid.html#behavior-with-other-queries
        const report = await createOrUpdate({
          ...submittedReport,
          approvers: [
            {
              userId: mockUserTwo.id,
              status: APPROVER_STATUSES.NEEDS_ACTION,
              note: 'change x, y, z',
            },
            {
              userId: mockUserThree.id,
              status: APPROVER_STATUSES.APPROVED,
              note: 'great job',
            },
          ],
        });
        // Soft delete needs_action approver
        await removeRatifier(
          ENTITY_TYPES.REPORT,
          report.id,
          mockUserTwo.id,
        );
        const [foundReport] = await activityReportAndRecipientsById(report.id);
        // Show both approvers
        expect(foundReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);
        expect(foundReport.approvers.length).toEqual(1);
        expect(foundReport.approvers[0]).toEqual(expect.objectContaining({
          note: 'great job',
          status: APPROVER_STATUSES.APPROVED,
        }));
      });
    });

    describe('activityReports retrieval and sorting', () => {
      let latestReport;
      let firstGrant;

      beforeAll(async () => {
        const topicsOne = ['topic d', 'topic c'];
        const topicsTwo = ['topic b', 'topic a'];
        const firstRecipient = await Recipient.create({ id: RECIPIENT_ID_SORTING, name: 'aaaa', uei: 'NNA5N2KHMGM2' });
        firstGrant = await Grant.create({ id: RECIPIENT_ID_SORTING, number: 'anumber', recipientId: firstRecipient.id });

        await createOrUpdate({
          ...submittedReport,
          owner: { userId: mockUserTwo.id },
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          topics: topicsOne,
        });
        await createOrUpdate({
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          collaborators: [{ user: { id: mockUser.id } }],
        });
        await createOrUpdate({
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          regionId: 2,
        });
        const report = await createOrUpdate({
          ...submittedReport,
          activityRecipients: [{ grantId: firstGrant.id }],
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          topics: topicsTwo,
        });
        try {
          await ActivityRecipient.create({
            activityReportId: report.id,
            grantId: firstGrant.id,
          });
        } catch (error) {
          auditLogger.error(JSON.stringify(error));
          throw error;
        }
        latestReport = await createOrUpdate({
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          updatedAt: '1900-01-01T12:00:00Z',
        });
        await createOrUpdate({
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          startDate: '2020-08-31T12:00:00Z',
          endDate: '2020-08-31T12:00:00Z',
          topics: topicsTwo,
        });
      });

      it('retrieves reports with default sort by updatedAt', async () => {
        const { count, rows } = await activityReports({ 'region.in': ['1'], 'reportId.nctn': idsToExclude });
        expect(rows.length).toBe(5);
        expect(count).toBeDefined();
        expect(rows[0].id).toBe(latestReport.id);
      });

      it('retrieves reports sorted by author', async () => {
        reportObject.userId = mockUserTwo.id;

        const { rows } = await activityReports({
          sortBy: 'author', sortDir: 'asc', offset: 0, limit: 2, 'region.in': ['1'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(2);
        expect(rows[0].author.name).toBe(mockUser.name);
      });

      it('retrieves reports sorted by collaborators', async () => {
        await createOrUpdate(reportObject);

        const { rows } = await activityReports({
          sortBy: 'collaborators', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(5);
        expect(rows[0].activityReportCollaborators[0].user.name).toBe(mockUser.name);
      });

      it('retrieves reports sorted by id', async () => {
        await createOrUpdate({ ...reportObject, regionId: 1 });

        const { rows } = await activityReports({
          sortBy: 'regionId', sortDir: 'desc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(6);
        expect(rows[0].regionId).toBe(2);
      });

      it('retrieves reports sorted by activity recipients', async () => {
        const { rows, recipients } = await activityReports({
          sortBy: 'activityRecipients', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nctn': idsToExclude,
        });

        expect(rows.length).toBe(6);

        expect(rows[0].id).toBe(recipients[0].activityReportId);
      });

      it('retrieves reports sorted by sorted topics', async () => {
        await createOrUpdate(reportObject);
        await createOrUpdate(reportObject);

        const { rows } = await activityReports({
          sortBy: 'topics', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(6);
        expect(rows[0].sortedTopics[0]).toBe('topic a');
        expect(rows[0].sortedTopics[1]).toBe('topic b');
        expect(rows[1].sortedTopics[0]).toBe('topic c');
        expect(rows[0].topics[0]).toBe('topic a');
        expect(rows[0].topics[1]).toBe('topic b');
        expect(rows[1].topics[0]).toBe('topic c');
      });
    });

    describe('possibleRecipients', () => {
      it('retrieves correct recipients in region', async () => {
        const region = 19;
        const recipients = await possibleRecipients(region);

        expect(recipients.grants.length).toBe(1);
      });

      it('retrieves no recipients in empty region', async () => {
        const region = 100;
        const recipients = await possibleRecipients(region);

        expect(recipients.grants.length).toBe(0);
      });
    });

    describe('getAllDownloadableActivityReports', () => {
      let approvedReport;
      let legacyReport;
      let nonApprovedReport;

      beforeAll(async () => {
        const mockLegacyReport = {
          ...submittedReport,
          imported: { foo: 'bar' },
          legacyId: 'R14-AR-123456',
          regionId: 14,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
        };
        const mockReport = {
          ...submittedReport,
          regionId: 14,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
        };
        // create two approved
        approvedReport = await createOrUpdate({
          ...mockReport,
          approvers: [{
            userId: mockUserTwo.id,
            status: RATIFIER_STATUSES.RATIFIED,
          }],
        });
        await createOrUpdate(mockReport);
        // create one approved legacy
        legacyReport = await createOrUpdate(mockLegacyReport);
        // create one submitted
        nonApprovedReport = await createOrUpdate({
          ...mockReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
        });
      });

      it('returns all approved reports', async () => {
        const rows = await getAllDownloadableActivityReports([14]);
        const ids = rows.map((row) => row.id);
        expect(ids.length).toEqual(3);
        expect(ids).toContain(approvedReport.id);
        expect(ids).toContain(legacyReport.id);
      });

      it('will return legacy reports', async () => {
        const rows = await getAllDownloadableActivityReports([14], {}, true);
        const ids = rows.map((row) => row.id);
        expect(ids).toContain(legacyReport.id);

        const secondResult = await getDownloadableActivityReportsByIds(
          [14],
          { report: [legacyReport.id] },
          true,
        );

        expect(secondResult.length).toEqual(1);
        expect(secondResult[0].id).toEqual(legacyReport.id);
      });

      it('excludes non-approved reports', async () => {
        const rows = await getAllDownloadableActivityReports([14]);
        const ids = rows.map((row) => row.id);
        expect(ids).not.toContain(nonApprovedReport.id);
      });
    });

    describe('getAllDownloadableActivityReportAlerts', () => {
      let report;

      beforeAll(async () => {
        const mockSubmittedReport = {
          ...submittedReport,
          regionId: 14,
          userId: alertsMockUserOne.id,
        };
        const mockNeedsActionReport = {
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
          regionId: 14,
          userId: alertsMockUserTwo.id,
        };
        await createOrUpdate(mockSubmittedReport);
        report = await createOrUpdate(mockNeedsActionReport);
      });

      // eslint-disable-next-line jest/no-disabled-tests
      it('do not alert for submitted reports', async () => {
        const rows = await getAllDownloadableActivityReportAlerts(alertsMockUserOne.id);
        expect(rows.length).toEqual(0); // fails, rcvd 13
      });
      // eslint-disable-next-line jest/no-disabled-tests
      it('returns all reports that need action', async () => {
        const rows = await getAllDownloadableActivityReportAlerts(alertsMockUserTwo.id);
        const ids = rows.map((row) => row.id);

        expect(ids.length).toEqual(1); // fails, rcvd 6
        expect(ids).toContain(report.id);
      });
    });

    describe('getDownloadableActivityReportsByIds', () => {
      it('returns report when passed a single report id', async () => {
        const mockReport = {
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
        };
        const report = await createOrUpdate(mockReport);
        const rows = await getDownloadableActivityReportsByIds([1], { report: report.id });

        expect(rows.length).toEqual(1);
        expect(rows[0].id).toEqual(report.id);
      });

      it('includes legacy reports', async () => {
        const mockLegacyReport = {
          ...reportObject,
          imported: { foo: 'bar' },
          legacyId: 'R14-AR-abc123',
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
        };
        const legacyReport = await createOrUpdate(mockLegacyReport);

        const mockReport = {
          ...submittedReport,
        };
        const report = await createOrUpdate(mockReport);

        const rows = await getDownloadableActivityReportsByIds(
          [1],
          { report: [report.id, legacyReport.id] },
        );

        expect(rows.length).toEqual(2);
        expect(rows.map((row) => row.id)).toContain(legacyReport.id);
      });

      it('ignores invalid report ids', async () => {
        const mockReport = {
          ...submittedReport,
          approval: {
            submissionStatus: REPORT_STATUSES.SUBMITTED,
            calculatedStatus: REPORT_STATUSES.APPROVED,
          },
        };
        const report = await createOrUpdate(mockReport);

        const rows = await getDownloadableActivityReportsByIds(
          [1],
          { report: [report.id, 'invalidIdentifier'] },
        );

        expect(rows.length).toEqual(1);
        expect(rows[0].id).toEqual(report.id);
      });
    });
    describe('setStatus', () => {
      it('sets report to draft', async () => {
        const report = await createOrUpdate(submittedReport);
        expect(report.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
        await setStatus(report, REPORT_STATUSES.DRAFT);
        // get report again so we're checking that the change is persisted to the database
        const updatedReport = await ActivityReport.findOne({ where: { id: report.id } });
        expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
      });
    });
  });

  describe('batchQuery', () => {
    const reports = [];

    beforeAll(async () => {
      const activityRecipients = [{ grantId: 10000 }];
      reports.push(await createReport({ activityRecipients }));
      reports.push(await createReport({ activityRecipients }));
      reports.push(await createReport({ activityRecipients }));
    });

    afterAll(async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const r of reports) {
        // eslint-disable-next-line no-await-in-loop
        await destroyReport(r);
      }
    });

    it('handles results with less items then the limit', async () => {
      const ids = reports.map((r) => r.id);
      ids.sort();
      const where = {
        id: ids,
      };

      const res = await batchQuery({ where }, 100);
      const resIds = res.map((r) => r.id);
      resIds.sort();
      expect(resIds).toEqual(ids);
    });

    it('handles results with more items then the limit', async () => {
      const ids = reports.map((r) => r.id);
      ids.sort();
      const where = {
        id: ids,
      };

      const res = await batchQuery({ where }, 1);
      const resIds = res.map((r) => r.id);
      resIds.sort();
      expect(resIds).toEqual(ids);
    });
  });
});
