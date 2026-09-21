import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import { NOTIFICATION_TYPES } from '../constants';
import db, {
  ActivityRecipient,
  ActivityReport,
  ActivityReportApprover,
  Notification,
  NotificationUserState,
  sequelize,
  User,
} from '../models';
import { syncApprovers, upsertApprover } from './activityReportApprovers';
import { activityReportAndRecipientsById } from './activityReports';

const mockUser = {
  id: 11184161,
  homeRegionId: 1,
  hsesUsername: 'user11184161',
  hsesUserId: 'user11184161',
  lastLogin: new Date(),
};

const mockUserTwo = {
  id: 22261035,
  homeRegionId: 1,
  hsesUsername: 'user22261035',
  hsesUserId: 'user22261035',
  lastLogin: new Date(),
};

const mockManager = {
  id: 22284981,
  homeRegionId: 1,
  hsesUsername: 'user22284981',
  hsesUserId: 'user22284981',
  lastLogin: new Date(),
};

const secondMockManager = {
  id: 33384616,
  homeRegionId: 1,
  hsesUsername: 'user33384616',
  hsesUserId: 'user33384616',
  lastLogin: new Date(),
};

const submittedReport = {
  userId: mockUser.id,
  regionId: 1,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  activityRecipientType: 'something',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  language: ['English'],
  activityReason: 'reason',
  version: 2,
  creatorRole: 'TTAC',
};

const draftReport = {
  ...submittedReport,
  submissionStatus: REPORT_STATUSES.DRAFT,
};

describe('activityReportApprovers services', () => {
  beforeAll(async () => {
    await User.bulkCreate([mockUser, mockUserTwo, mockManager, secondMockManager]);
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({
      where: {
        userId: [mockUser.id, mockUserTwo.id],
      },
    });
    const reportIds = reports.map((report) => report.id);
    if (reportIds.length) {
      const notifications = await Notification.findAll({ where: { entityId: reportIds } });
      const notificationIds = notifications.map((notification) => notification.id);
      if (notificationIds.length) {
        await NotificationUserState.destroy({ where: { notificationId: notificationIds } });
        await Notification.destroy({ where: { id: notificationIds } });
      }
    }
    await ActivityReportApprover.destroy({
      where: { activityReportId: reportIds },
      force: true,
    });
    await ActivityRecipient.destroy({ where: { activityReportId: reportIds } });
    await ActivityReport.destroy({ where: { id: reportIds } });
    await User.destroy({
      where: { id: [mockUser.id, mockUserTwo.id, mockManager.id, secondMockManager.id] },
    });
    await db.sequelize.close();
  });

  describe('upsertApprover and ActivityReportApprover hooks', () => {
    describe('for submitted reports', () => {
      it('calculatedStatus is "needs action" if any approver "needs_action"', async () => {
        const report1 = await ActivityReport.create(submittedReport);
        // One approved
        await ActivityReportApprover.create({
          activityReportId: report1.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.APPROVED,
        });
        // One pending
        await ActivityReportApprover.create({
          activityReportId: report1.id,
          userId: secondMockManager.id,
        });
        // Works with managed transaction
        await sequelize.transaction(async () => {
          // Pending updated to needs_action
          const approver = await upsertApprover({
            status: APPROVER_STATUSES.NEEDS_ACTION,
            activityReportId: report1.id,
            userId: secondMockManager.id,
          });
          expect(approver.status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
          expect(approver.user).toBeDefined();
        });
        const [updatedReport] = await activityReportAndRecipientsById(report1.id);
        expect(updatedReport.approvedAt).toBeNull();
        expect(updatedReport.approvedAtTimezone).toBeNull();
        expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);
      });
      it('calculatedStatus is "approved" if all approvers approve', async () => {
        const report2 = await ActivityReport.create(submittedReport);
        // One pending
        await ActivityReportApprover.create({
          activityReportId: report2.id,
          userId: mockManager.id,
        });
        // Pending updated to approved
        const approver = await upsertApprover({
          activityReportId: report2.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.APPROVED,
        });
        expect(approver.status).toEqual(APPROVER_STATUSES.APPROVED);
        const [updatedReport] = await activityReportAndRecipientsById(report2.id);
        expect(updatedReport.approvedAt).toBeTruthy();
        expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);
      });
      it('calculatedStatus is "submitted" if approver is pending', async () => {
        const report3 = await ActivityReport.create(submittedReport);
        // One approved
        await ActivityReportApprover.create({
          activityReportId: report3.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.APPROVED,
        });
        // One pending
        const approver = await upsertApprover({
          activityReportId: report3.id,
          userId: secondMockManager.id,
        });
        expect(approver.status).toBeNull();
        const [updatedReport] = await activityReportAndRecipientsById(report3.id);
        expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);
      });
      it('calculatedStatus does not use soft deleted approver, until it is restored', async () => {
        const report4 = await ActivityReport.create(submittedReport);
        const needsActionApproval = {
          activityReportId: report4.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.NEEDS_ACTION,
          note: 'make changes a, b, c',
        };
        // One needs_action
        await upsertApprover(needsActionApproval);
        // One pending
        await upsertApprover({
          activityReportId: report4.id,
          userId: secondMockManager.id,
        });
        const [updatedReport] = await activityReportAndRecipientsById(report4.id);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);
        // Soft delete needs_action
        await ActivityReportApprover.destroy({ where: needsActionApproval, individualHooks: true });
        const [afterDeleteReport] = await activityReportAndRecipientsById(report4.id);
        expect(afterDeleteReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);
        // Upsert restores needs_action
        await upsertApprover(needsActionApproval);
        const [afterRestoreReport] = await activityReportAndRecipientsById(report4.id);
        expect(afterRestoreReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);
      });
    });
    describe('for draft reports', () => {
      it('adding approver does not update calculatedStatus to "submitted"', async () => {
        const report = await ActivityReport.create(draftReport);
        // One pending
        await upsertApprover({
          activityReportId: report.id,
          userId: mockManager.id,
        });
        const [updatedReport] = await activityReportAndRecipientsById(report.id);
        expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);
      });
    });
  });

  describe('syncApprovers', () => {
    it('adds approvers who are in userIds param', async () => {
      const report = await ActivityReport.create({ ...submittedReport, userId: mockUserTwo.id });
      const result = await syncApprovers(report.id, [mockManager.id, secondMockManager.id]);
      expect(result.length).toBe(2);
    });
    it('destroys approvers who are not in userIds param, restores them if added later', async () => {
      const report = await ActivityReport.create({ ...submittedReport, userId: mockUserTwo.id });
      await ActivityReportApprover.bulkCreate(
        [
          {
            activityReportId: report.id,
            userId: mockManager.id,
          },
          {
            activityReportId: report.id,
            userId: secondMockManager.id,
            status: APPROVER_STATUSES.NEEDS_ACTION,
            note: 'do x, y, x',
          },
        ],
        { validate: true, individualHooks: true }
      );
      // remove mockManager
      const afterRemove = await syncApprovers(report.id);
      // check removed
      expect(afterRemove.length).toBe(0);
      // restore
      const afterRestore = await syncApprovers(report.id, [mockManager.id, secondMockManager.id]);
      // check restored
      expect(afterRestore.length).toBe(2);
      const approverIds = afterRestore.map((a) => a.userId);
      expect(approverIds).toContain(secondMockManager.id);
      expect(approverIds).toContain(mockManager.id);
      const mgrWithStatus = afterRestore.find((manager) => manager.userId === secondMockManager.id);
      expect(mgrWithStatus.status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
    });
  });

  describe('archives notifications on the SUBMITTED -> APPROVED transition', () => {
    const TYPES_ARCHIVED_ON_APPROVAL = [
      NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_COLLABORATOR,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED_CREATOR,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED,
      NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED_APPROVER,
    ];

    it.each(TYPES_ARCHIVED_ON_APPROVAL)(
      'archives %s notifications when the report transitions to APPROVED',
      async (type) => {
        const report = await ActivityReport.create({ ...submittedReport });
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockManager.id,
        });

        const notification = await Notification.create({ entityId: report.id, type });
        const userState = await NotificationUserState.create({
          notificationId: notification.id,
          userId: mockManager.id,
          archivedAt: null,
        });

        await upsertApprover({
          activityReportId: report.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.APPROVED,
        });

        const [updatedReport] = await activityReportAndRecipientsById(report.id);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        const updatedUserState = await NotificationUserState.findByPk(userState.id);
        expect(updatedUserState.archivedAt).not.toBeNull();
      }
    );

    it('creates a NotificationUserState row when none exists for the notification', async () => {
      const report = await ActivityReport.create({ ...submittedReport });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockManager.id,
      });

      const notification = await Notification.create({
        entityId: report.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
        userId: mockManager.id,
      });

      await upsertApprover({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      const createdUserState = await NotificationUserState.findOne({
        where: { notificationId: notification.id, userId: mockManager.id },
      });
      expect(createdUserState).not.toBeNull();
      expect(createdUserState.archivedAt).not.toBeNull();
    });

    it('preserves an existing archivedAt timestamp rather than overwriting it', async () => {
      const report = await ActivityReport.create({ ...submittedReport });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockManager.id,
      });

      const notification = await Notification.create({
        entityId: report.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });
      const originalArchivedAt = '2020-01-01';
      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockManager.id,
        archivedAt: originalArchivedAt,
      });

      await upsertApprover({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      expect(updatedUserState.archivedAt).toEqual(originalArchivedAt);
    });

    it('does not archive notifications when the report does not transition to APPROVED', async () => {
      const report = await ActivityReport.create({ ...submittedReport });
      // Two approvers, only one approves -- the report stays SUBMITTED overall.
      await ActivityReportApprover.create({ activityReportId: report.id, userId: mockManager.id });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: secondMockManager.id,
      });

      const notification = await Notification.create({
        entityId: report.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });
      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockManager.id,
        archivedAt: null,
      });

      await upsertApprover({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      const [updatedReport] = await activityReportAndRecipientsById(report.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      expect(updatedUserState.archivedAt).toBeNull();
    });

    it('does not re-archive when an already-approved report is updated again', async () => {
      const report = await ActivityReport.create({ ...submittedReport });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockManager.id,
      });

      const notification = await Notification.create({
        entityId: report.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });
      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockManager.id,
        archivedAt: null,
      });

      await upsertApprover({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      const [approvedReport] = await activityReportAndRecipientsById(report.id);
      expect(approvedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      // Simulate the notification having since been unarchived by some other flow. If the
      // service incorrectly re-ran archival on an APPROVED -> APPROVED no-op transition,
      // this would flip back to non-null.
      await NotificationUserState.update({ archivedAt: null }, { where: { id: userState.id } });

      await upsertApprover({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'still approved',
      });

      const finalUserState = await NotificationUserState.findByPk(userState.id);
      expect(finalUserState.archivedAt).toBeNull();
    });

    it('archives notifications when a destroy via syncApprovers completes the approval', async () => {
      const report = await ActivityReport.create({ ...submittedReport });
      // mockManager has already approved; secondMockManager is still pending.
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
      });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: secondMockManager.id,
      });

      const [pendingReport] = await activityReportAndRecipientsById(report.id);
      expect(pendingReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

      const notification = await Notification.create({
        entityId: report.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });
      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockManager.id,
        archivedAt: null,
      });

      // Removing the pending approver leaves only the already-approved approver, which
      // completes the report's approval as a side effect of the destroy.
      await syncApprovers(report.id, [mockManager.id]);

      const [updatedReport] = await activityReportAndRecipientsById(report.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      expect(updatedUserState.archivedAt).not.toBeNull();
    });

    it('leaves ACTIVITY_REPORT_APPROVED notifications untouched on approval', async () => {
      const report = await ActivityReport.create({ ...submittedReport });
      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockManager.id,
      });

      const notification = await Notification.create({
        entityId: report.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
      });
      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockUser.id,
        archivedAt: null,
      });

      await upsertApprover({
        activityReportId: report.id,
        userId: mockManager.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      const untouchedUserState = await NotificationUserState.findByPk(userState.id);
      expect(untouchedUserState.archivedAt).toBeNull();
    });
  });
});
