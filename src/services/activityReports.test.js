import db, {
  ActivityReport, ActivityReportApprover, ActivityReportCollaborator, ActivityRecipient, User,
  Recipient, OtherEntity, Grant, NextStep, Region, Permission,
} from '../models';
import {
  createOrUpdate,
  activityReportById,
  possibleRecipients,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReports,
  getAllDownloadableActivityReportAlerts,
  setStatus,
  batchQuery,
} from './activityReports';
import SCOPES from '../middleware/scopeConstants';
import { APPROVER_STATUSES, REPORT_STATUSES } from '../constants';

import { createReport, destroyReport } from '../testUtils';

const RECIPIENT_ID = 30;
const RECIPIENT_ID_SORTING = 31;
const ALERT_RECIPIENT_ID = 345;

const mockUser = {
  id: 1115665161,
  homeRegionId: 1,
  name: 'user1115665161',
  hsesUsername: 'user1115665161',
  hsesUserId: 'user1115665161',
  role: ['Grants Specialist', 'Health Specialist'],
};

const mockUserTwo = {
  id: 265157914,
  homeRegionId: 1,
  name: 'user265157914',
  hsesUserId: 'user265157914',
  hsesUsername: 'user265157914',
  role: ['COR'],
};

const mockUserThree = {
  id: 39861962,
  homeRegionId: 1,
  name: 'user39861962',
  hsesUserId: 'user39861962',
  hsesUsername: 'user39861962',
  role: [],
};

const mockUserFour = {
  id: 49861962,
  homeRegionId: 1,
  name: 'user49861962',
  hsesUserId: 'user49861962',
  hsesUsername: 'user49861962',
  role: [],
};

const mockUserFive = {
  id: 55861962,
  homeRegionId: 1,
  name: 'user55861962',
  hsesUserId: 'user55861962',
  hsesUsername: 'user55861962',
  role: [],
};

const alertsMockUserOne = {
  id: 16465416,
  homeRegionId: 1,
  name: 'a',
  hsesUserId: 'a',
  hsesUsername: 'a',
  role: [],
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
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: RECIPIENT_ID }],
};

const submittedReport = {
  ...reportObject,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.SUBMITTED,
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
        ]),
        OtherEntity.create({ id: ALERT_RECIPIENT_ID, name: 'alert otherEntity' }),
        Recipient.create({ name: 'alert recipient', id: ALERT_RECIPIENT_ID }),
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
      const reports = await ActivityReport.findAll({ where: { userId: userIds } });
      const ids = reports.map((report) => report.id);
      await NextStep.destroy({ where: { activityReportId: ids } });
      await ActivityRecipient.destroy({ where: { activityReportId: ids } });
      await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true });
      await ActivityReportCollaborator.destroy({ where: { activityReportId: ids }, force: true });
      await ActivityReport.destroy({ where: { id: ids } });
      await User.destroy({ where: { id: userIds } });
      await Permission.destroy({ where: { userId: userIds } });
      await OtherEntity.destroy({ where: { id: ALERT_RECIPIENT_ID } });
      await Grant.destroy({ where: { id: [ALERT_RECIPIENT_ID] } });
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
      await ActivityReport.create({
        ...reportObject,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        userId: mockUserFour.id,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Submitted.
      await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFour.id,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Needs Action.
      await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFour.id,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Approved (Should be missing).
      await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFour.id,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Is Only Approver.
      const isOnlyApproverReport = await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFive.id,
        lastUpdatedById: mockUserFive.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Add Approver.
      await ActivityReportApprover.create({
        activityReportId: isOnlyApproverReport.id,
        userId: mockUserFour.id,
        status: null,
      });

      // Is Only Collaborator.
      const isOnlyCollabReport = await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFive.id,
        lastUpdatedById: mockUserFive.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      });

      // Add Collaborator.
      await ActivityReportCollaborator.create({
        activityReportId: isOnlyCollabReport.id,
        userId: mockUserFour.id,
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
        ]),
        OtherEntity.create({ id: RECIPIENT_ID, name: 'otherEntity' }),
        Recipient.findOrCreate({ where: { name: 'recipient', id: RECIPIENT_ID } }),
        Region.create({ name: 'office 19', id: 19 }),
      ]);
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
      const reports = await ActivityReport.findAll({ where: { userId: userIds } });
      const ids = reports.map((report) => report.id);
      await NextStep.destroy({ where: { activityReportId: ids } });
      await ActivityRecipient.destroy({ where: { activityReportId: ids } });
      await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true });
      await ActivityReportCollaborator.destroy({ where: { activityReportId: ids }, force: true });
      await ActivityReport.destroy({ where: { id: ids } });
      await User.destroy({ where: { id: userIds } });
      await Permission.destroy({ where: { userId: userIds } });
      await OtherEntity.destroy({ where: { id: RECIPIENT_ID } });
      await Grant.destroy({ where: { id: [RECIPIENT_ID, RECIPIENT_ID_SORTING] } });
      await Recipient.destroy({ where: { id: [RECIPIENT_ID, RECIPIENT_ID_SORTING] } });
      await Region.destroy({ where: { id: 19 } });
    });

    describe('createOrUpdate', () => {
      it('updates an already saved report', async () => {
        const report = await ActivityReport.create({ ...reportObject, id: 3334 });
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
            1: 'Not started',
            2: 'Not started',
            3: 'Not started',
            4: 'Not started',
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
        const beginningARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } });
        const report = await createOrUpdate(reportObject);
        const endARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } });
        expect(endARCount.length - beginningARCount.length).toBe(1);
        expect(report.activityRecipients[0].grant.id).toBe(RECIPIENT_ID);
        // Check afterCreate copySubmissionStatus hook
        expect(report.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
      });

      it('creates a new report with other-entity recipient', async () => {
        const report = await createOrUpdate({ ...reportObject, activityRecipientType: 'other-entity' });
        expect(report.activityRecipients[0].otherEntity.id).toBe(RECIPIENT_ID);
      });

      it('handles reports with collaborators', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          activityReportCollaborators: [{ user: { id: mockUser.id } }],
        });
        expect(report.activityReportCollaborators.length).toBe(1);
        expect(report.activityReportCollaborators[0].user.name).toBe(mockUser.name);
      });

      it('creates a new report and sets collaborator roles', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          activityReportCollaborators: [
            { user: { id: mockUser.id } },
            { user: { id: mockUserTwo.id } },
            { user: { id: mockUserThree.id } },
          ],
        });
        expect(report.activityReportCollaborators.length).toBe(3);

        // Mock User 1.
        let activityReportCollaborator = report.activityReportCollaborators.filter(
          (u) => u.user.name === mockUser.name,
        );
        expect(activityReportCollaborator).not.toBe(null);
        expect(activityReportCollaborator.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles.length).toBe(2);
        activityReportCollaborator[0].collaboratorRoles.sort(
          (a, b) => ((a.role > b.role) ? 1 : -1),
        );
        expect(activityReportCollaborator[0].collaboratorRoles[0].role).toBe('Grants Specialist');
        expect(activityReportCollaborator[0].collaboratorRoles[1].role).toBe('Health Specialist');

        // Mock User 2.
        activityReportCollaborator = report.activityReportCollaborators.filter(
          (c) => c.user.name === mockUserTwo.name,
        );
        expect(activityReportCollaborator).not.toBe(null);
        expect(activityReportCollaborator.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles[0].role).toBe('COR');

        // Mock User 3.
        activityReportCollaborator = report.activityReportCollaborators.filter(
          (c) => c.user.name === mockUserThree.name,
        );
        expect(activityReportCollaborator).not.toBe(null);
        expect(activityReportCollaborator.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles.length).toBe(0);
      });

      it('updates collaborator roles on a already saved report', async () => {
        const report = await ActivityReport.create({
          ...reportObject,
          id: 3438,
          activityReportCollaborators: [
            { user: { id: mockUserTwo.id } },
            { user: { id: mockUserThree.id } }, // Missing role.
          ],
        });
        // Add role to user.
        await User.update(
          { role: ['System Specialist'] },
          {
            where: { id: mockUserThree.id },
          },
        );

        const updatedReport = await createOrUpdate(
          {
            ...report,
            // Remove collaborator 2.
            activityReportCollaborators: [
              { user: { id: mockUser.id } },
              { user: { id: mockUserThree.id } },
            ],
          },
          report,
        );
        expect(updatedReport.activityReportCollaborators.length).toBe(2);

        // Mock User 1.
        let activityReportCollaborator = updatedReport.activityReportCollaborators.filter(
          (u) => u.user.name === mockUser.name,
        );
        expect(activityReportCollaborator).not.toBe(null);
        expect(activityReportCollaborator.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles.length).toBe(2);
        activityReportCollaborator[0].collaboratorRoles.sort(
          (a, b) => ((a.role > b.role) ? 1 : -1),
        );
        expect(activityReportCollaborator[0].collaboratorRoles[0].role).toBe('Grants Specialist');
        expect(activityReportCollaborator[0].collaboratorRoles[1].role).toBe('Health Specialist');

        // Mock User 3.
        activityReportCollaborator = updatedReport.activityReportCollaborators.filter(
          (c) => c.user.name === mockUserThree.name,
        );
        expect(activityReportCollaborator).not.toBe(null);
        expect(activityReportCollaborator.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles.length).toBe(1);
        expect(activityReportCollaborator[0].collaboratorRoles[0].role).toBe('System Specialist'); // Updated role.
      });

      it('handles notes being created', async () => {
        // Given an report with some notes
        const reportObjectWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };
        // When that report is created
        const report = await createOrUpdate(reportObjectWithNotes);
        // Then we see that it was saved correctly
        expect(report.specialistNextSteps.length).toBe(2);
        expect(report.recipientNextSteps.length).toBe(2);
        expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
        expect(report.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
      });

      it('handles specialist notes being created', async () => {
        // Given a report with specliasts notes
        // And no recipient notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [],
        };

        // When that report is created
        const report = await createOrUpdate(reportWithNotes);

        // Then we see that it was saved correctly
        expect(report.recipientNextSteps.length).toBe(0);
        expect(report.specialistNextSteps.length).toBe(2);
        expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
      });

      it('handles recipient notes being created', async () => {
        // Given a report with recipient notes
        // And not specialist notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };

        // When that report is created
        const report = await createOrUpdate(reportWithNotes);

        // Then we see that it was saved correctly
        expect(report.specialistNextSteps.length).toBe(0);
        expect(report.recipientNextSteps.length).toBe(2);
        expect(report.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
      });

      it('handles specialist notes being updated', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };
        const report = await ActivityReport.create(reportWithNotes);

        // When the report is updated with new set of specialist notes
        const notes = { specialistNextSteps: [{ note: 'harry' }, { note: 'spongebob' }] };
        const updatedReport = await createOrUpdate(notes, report);

        // Then we see it was updated correctly
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.specialistNextSteps.map((n) => n.note))
          .toEqual(expect.arrayContaining(['harry', 'spongebob']));
      });

      it('handles recipient notes being updated', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };
        const report = await ActivityReport.create(reportWithNotes);

        // When the report is updated with new set of recipient notes
        const notes = { recipientNextSteps: [{ note: 'One Piece' }, { note: 'spongebob' }] };
        const updatedReport = await createOrUpdate(notes, report);

        // Then we see it was updated correctly
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.recipientNextSteps.map((n) => n.note))
          .toEqual(expect.arrayContaining(['One Piece', 'spongebob']));
      });

      it('handles notes being updated to empty', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };
        const report = await ActivityReport.create(reportWithNotes);

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
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        };
        const report = await createOrUpdate(reportWithNotes);
        const recipientIds = report.recipientNextSteps.map((note) => note.id);
        const specialistsIds = report.specialistNextSteps.map((note) => note.id);

        // When the report is updated with same notes
        const notes = {
          specialistNextSteps: report.specialistNextSteps,
          recipientNextSteps: report.recipientNextSteps,
        };
        const updatedReport = await createOrUpdate(notes, report);

        // Then we see nothing changes
        // And we are re-using the same old ids
        expect(updatedReport.id).toBe(report.id);
        expect(updatedReport.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']));
        expect(updatedReport.recipientNextSteps.map((n) => n.id))
          .toEqual(expect.arrayContaining(recipientIds));

        expect(updatedReport.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']));
        expect(updatedReport.specialistNextSteps.map((n) => n.id))
          .toEqual(expect.arrayContaining(specialistsIds));
      });

      it('calls syncApprovers appropriately', async () => {
        const reportWithApprovers = {
          ...reportObject,
          approverUserIds: [mockUserTwo.id],
        };
        // Calls syncApprovers when approverUserIds is present
        const report = await createOrUpdate(reportWithApprovers);
        expect(report.approvers[0].User.id).toEqual(mockUserTwo.id);
        // When syncApprovers is undefined, skip call, avoid removing approvers
        const reportTwo = await createOrUpdate({ ...reportObject, regionId: 3 }, report);
        expect(reportTwo.approvers[0].User.id).toEqual(mockUserTwo.id);
        expect(reportTwo.regionId).toEqual(3);
      });
    });

    describe('activityReportByLegacyId', () => {
      it('returns the report with the legacyId', async () => {
        const report = await ActivityReport.create({ ...reportObject, legacyId: 'legacy' });
        const found = await activityReportByLegacyId('legacy');
        expect(found.id).toBe(report.id);
      });
    });

    describe('activityReportById', () => {
      it('retrieves an activity report', async () => {
        const report = await ActivityReport.create(reportObject);

        const foundReport = await activityReportById(report.id);
        expect(foundReport.id).toBe(report.id);
        expect(foundReport.ECLKCResourcesUsed).toEqual(['test']);
      });
      it('includes approver with full name', async () => {
        const report = await ActivityReport.create({ ...submittedReport, regionId: 5 });
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockUserTwo.id,
          status: APPROVER_STATUSES.APPROVED,
          note: 'great job from user 2',
        });
        const foundReport = await activityReportById(report.id);
        expect(foundReport.approvers[0].User.get('fullName')).toEqual(`${mockUserTwo.name}, ${mockUserTwo.role[0]}`);
      });
      it('excludes soft deleted approvers', async () => {
        // To include deleted approvers in future add paranoid: false
        // attribute to include object for ActivityReportApprover
        // https://sequelize.org/master/manual/paranoid.html#behavior-with-other-queries
        const report = await ActivityReport.create(submittedReport);
        // Create needs_action approver
        const toDeleteApproval = await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockUserTwo.id,
          status: APPROVER_STATUSES.NEEDS_ACTION,
          note: 'change x, y, z',
        });
        // Create approved approver
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockUserThree.id,
          status: APPROVER_STATUSES.APPROVED,
          note: 'great job',
        });
        // Soft delete needs_action approver
        await ActivityReportApprover.destroy({
          where: { id: toDeleteApproval.id },
          individualHooks: true,
        });
        const foundReport = await activityReportById(report.id);
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
        const firstRecipient = await Recipient.create({ id: RECIPIENT_ID_SORTING, name: 'aaaa' });
        firstGrant = await Grant.create({ id: RECIPIENT_ID_SORTING, number: 'anumber', recipientId: firstRecipient.id });

        await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          userId: mockUserTwo.id,
          topics: topicsOne,
        });
        await createOrUpdate({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          activityReportCollaborators: [{ user: { id: mockUser.id } }],
        });
        await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          regionId: 2,
        });
        const report = await ActivityReport.create({
          ...submittedReport,
          activityRecipients: [{ grantId: firstGrant.id }],
          calculatedStatus: REPORT_STATUSES.APPROVED,
          topics: topicsTwo,
        });
        await ActivityRecipient.create({
          activityReportId: report.id,
          grantId: firstGrant.id,
        });
        latestReport = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          updatedAt: '1900-01-01T12:00:00Z',
        });
        await ActivityReport.create({
          ...submittedReport,
          status: REPORT_STATUSES.APPROVED,
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
        await ActivityReport.create(reportObject);

        const { rows } = await activityReports({
          sortBy: 'collaborators', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(5);
        expect(rows[0].activityReportCollaborators[0].user.name).toBe(mockUser.name);
      });

      it('retrieves reports sorted by id', async () => {
        await ActivityReport.create({ ...reportObject, regionId: 1 });

        const { rows } = await activityReports({
          sortBy: 'regionId', sortDir: 'desc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(6);
        expect(rows[0].regionId).toBe(2);
      });

      it('retrieves reports sorted by activity recipients', async () => {
        const { rows } = await activityReports({
          sortBy: 'activityRecipients', sortDir: 'asc', offset: 0, limit: 12, 'region.in': ['1', '2'], 'reportId.nctn': idsToExclude,
        });
        expect(rows.length).toBe(6);
        expect(rows[0].activityRecipients[0].grantId).toBe(firstGrant.id);
      });

      it('retrieves reports sorted by sorted topics', async () => {
        await ActivityReport.create(reportObject);
        await ActivityReport.create(reportObject);

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

      it('retrieves all recipients when not specifying region', async () => {
        const recipients = await possibleRecipients();
        expect(recipients.grants.length).toBe(11);
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
          calculatedStatus: REPORT_STATUSES.APPROVED,
        };
        const mockReport = {
          ...submittedReport,
          regionId: 14,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        };
        // create two approved
        approvedReport = await ActivityReport.create(mockReport);
        await ActivityReportApprover.create({
          activityReportId: approvedReport.id,
          userId: mockUserTwo.id,
          status: APPROVER_STATUSES.APPROVED,
        });
        await ActivityReport.create(mockReport);
        // create one approved legacy
        legacyReport = await ActivityReport.create(mockLegacyReport);
        // create one submitted
        nonApprovedReport = await ActivityReport.create({
          ...mockReport, calculatedStatus: REPORT_STATUSES.SUBMITTED,
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
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
          regionId: 14,
          userId: alertsMockUserTwo.id,
        };
        await ActivityReport.create(mockSubmittedReport);
        report = await ActivityReport.create(mockNeedsActionReport);
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
          calculatedStatus: REPORT_STATUSES.APPROVED,
        };
        const report = await ActivityReport.create(mockReport);
        const rows = await getDownloadableActivityReportsByIds([1], { report: report.id });

        expect(rows.length).toEqual(1);
        expect(rows[0].id).toEqual(report.id);
      });

      it('includes legacy reports', async () => {
        const mockLegacyReport = {
          ...reportObject,
          imported: { foo: 'bar' },
          legacyId: 'R14-AR-abc123',
          calculatedStatus: REPORT_STATUSES.APPROVED,
        };
        const legacyReport = await ActivityReport.create(mockLegacyReport);

        const mockReport = {
          ...submittedReport,
        };
        const report = await ActivityReport.create(mockReport);

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
          calculatedStatus: REPORT_STATUSES.APPROVED,
        };
        const report = await ActivityReport.create(mockReport);

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
        const report = await ActivityReport.create(submittedReport);
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
      const where = {
        id: ids,
      };

      const res = await batchQuery({ where }, 100);
      expect(res.map((r) => r.id)).toEqual(ids);
    });

    it('handles results with more items then the limit', async () => {
      const ids = reports.map((r) => r.id);
      const where = {
        id: ids,
      };

      const res = await batchQuery({ where }, 1);
      expect(res.map((r) => r.id)).toEqual(ids);
    });
  });
});
