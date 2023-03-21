import db, {
  ActivityRecipient, ActivityReport, User, sequelize, UserRole,
} from '../models';
import {
  upsertReportApprover,
  syncReportApprovers,
  setReportApproverStatus,
  removeReportApprover,
} from './collaborators';
import { activityReportAndRecipientsById, createOrUpdate } from './activityReports';
import {
  APPROVER_STATUSES,
  REPORT_STATUSES,
  COLLABORATOR_TYPES,
} from '../constants';
import { auditLogger } from '../logger';

const mockUser = {
  id: 11184161,
  homeRegionId: 1,
  hsesUsername: 'user11184161',
  hsesUserId: 'user11184161',
};

const mockUserTwo = {
  id: 22261035,
  homeRegionId: 1,
  hsesUsername: 'user22261035',
  hsesUserId: 'user22261035',
};

const mockManager = {
  id: 22284981,
  homeRegionId: 1,
  hsesUsername: 'user22284981',
  hsesUserId: 'user22284981',
};

const secondMockManager = {
  id: 33384616,
  homeRegionId: 1,
  hsesUsername: 'user33384616',
  hsesUserId: 'user33384616',
};

const submittedReport = {
  regionId: 1,
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
  owner: { userId: mockUser.id },
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
  },
};

const draftReport = {
  ...submittedReport,
  approval: {
    submissionStatus: REPORT_STATUSES.DRAFT,
    calculatedStatus: REPORT_STATUSES.DRAFT,
  },
};

describe('collaborators services', () => {
  beforeAll(async () => {
    await User.bulkCreate([mockUser, mockUserTwo, mockManager, secondMockManager]);
    await UserRole.bulkCreate([
      { userId: mockUser.id, roleId: 5 },
      { userId: mockUserTwo.id, roleId: 5 },
      { userId: mockManager.id, roleId: 13 },
      { userId: secondMockManager.id, roleId: 13 },
    ]);
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({
      where: {
        userId: [mockUser.id, mockUserTwo.id],
      },
    });
    const reportIds = reports.map((report) => report.id);
    await Promise.all(reportIds.map(async (reportId) => Promise.all([
      removeReportApprover(reportId, mockUser.id),
      removeReportApprover(reportId, mockUserTwo.id),
    ])));
    await ActivityRecipient.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });
    await ActivityReport.destroy({
      where: { id: reportIds },
      individualHooks: true,
    });
    await UserRole.destroy({
      where: { userId: [mockUser.id, mockUserTwo.id, mockManager.id, secondMockManager.id] },
      individualHooks: true,
    });
    await User.destroy({
      where: { id: [mockUser.id, mockUserTwo.id, mockManager.id, secondMockManager.id] },
      individualHooks: true,
    });
    await db.sequelize.close();
  });

  describe('upsertApprover and Collaborator hooks', () => {
    describe('for submitted reports', () => {
      it('calculatedStatus is "needs action" if any approver "needs_action"', async () => {
        const report1 = await createOrUpdate(submittedReport);
        // One approved
        await upsertReportApprover({
          activityReportId: report1.id,
          userId: mockManager.id,
          collaboratorTypes: [COLLABORATOR_TYPES.APPROVER],
        });

        await setReportApproverStatus(
          report1.id,
          mockManager.id,
          APPROVER_STATUSES.APPROVED,
        );

        // One pending
        await upsertReportApprover({
          activityReportId: report1.id,
          userId: secondMockManager.id,
          collaboratorTypes: [COLLABORATOR_TYPES.APPROVER],
        });
        // Works with managed transaction
        await sequelize.transaction(async () => {
          // Pending updated to needs_action
          const approver = await setReportApproverStatus(
            report1.id,
            secondMockManager.id,
            APPROVER_STATUSES.NEEDS_ACTION,
          );
          expect(approver.status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
          expect(approver.user).toBeDefined();
        });
        const [updatedReport] = await activityReportAndRecipientsById(report1.id);
        expect(updatedReport.activityReportApproval.approvedAt)
          .toBeNull();
        expect(updatedReport.activityReportApproval.submissionStatus)
          .toEqual(REPORT_STATUSES.SUBMITTED);
        expect(updatedReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.NEEDS_ACTION);
      });
      it('calculatedStatus is "approved" if all approvers approve', async () => {
        const report2 = await createOrUpdate(submittedReport);
        // One pending
        await upsertReportApprover({
          activityReportId: report2.id,
          userId: mockManager.id,
        });
        // Pending updated to approved
        const approver = await setReportApproverStatus(
          report2.id,
          mockManager.id,
          APPROVER_STATUSES.APPROVED,
        );
        expect(approver.status).toEqual(APPROVER_STATUSES.APPROVED);
        const [updatedReport] = await activityReportAndRecipientsById(report2.id);
        auditLogger.error(JSON.stringify({ name: 'calculatedStatus is "approved" if all approvers approve', updatedReport }));
        expect(updatedReport.activityReportApproval.approvedAt)
          .toBeTruthy();
        expect(updatedReport.activityReportApproval.submissionStatus)
          .toEqual(REPORT_STATUSES.SUBMITTED);
        expect(updatedReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.APPROVED);
      });
      it('calculatedStatus is "submitted" if approver is pending', async () => {
        const report3 = await createOrUpdate(submittedReport);
        // One approved
        await upsertReportApprover({
          activityReportId: report3.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.APPROVED,
        });
        // One pending
        const approver = await upsertReportApprover({
          activityReportId: report3.id,
          userId: secondMockManager.id,
        });
        expect(approver.status).toBeNull();
        const [updatedReport] = await activityReportAndRecipientsById(report3.id);
        expect(updatedReport.activityReportApproval.submissionStatus)
          .toEqual(REPORT_STATUSES.SUBMITTED);
        expect(updatedReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.SUBMITTED);
      });
      it('calculatedStatus does not use soft deleted approver, until it is restored', async () => {
        const report4 = await createOrUpdate(submittedReport);
        const needsActionApproval = {
          activityReportId: report4.id,
          userId: mockManager.id,
          status: APPROVER_STATUSES.NEEDS_ACTION,
          note: 'make changes a, b, c',
        };
        // One needs_action
        await upsertReportApprover(needsActionApproval);
        // One pending
        await upsertReportApprover({
          activityReportId: report4.id,
          userId: secondMockManager.id,
        });
        const [updatedReport] = await activityReportAndRecipientsById(report4.id);
        expect(updatedReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.NEEDS_ACTION);
        // Soft delete needs_action
        await removeReportApprover(report4.id, mockManager.id);
        const [afterDeleteReport] = await activityReportAndRecipientsById(report4.id);
        expect(afterDeleteReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.SUBMITTED);
        // Upsert restores needs_action
        await upsertReportApprover(needsActionApproval);
        const [afterRestoreReport] = await activityReportAndRecipientsById(report4.id);
        expect(afterRestoreReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.NEEDS_ACTION);
      });
    });
    describe('for draft reports', () => {
      it('adding approver does not update calculatedStatus to "submitted"', async () => {
        const report = await createOrUpdate({
          ...draftReport,
          approvers: [{ userId: mockManager.id }],
        });
        const [updatedReport] = await activityReportAndRecipientsById(report.id);
        expect(updatedReport.activityReportApproval.submissionStatus)
          .toEqual(REPORT_STATUSES.DRAFT);
        expect(updatedReport.activityReportApproval.calculatedStatus)
          .toEqual(REPORT_STATUSES.DRAFT);
      });
    });
  });

  describe('syncRatifiers', () => {
    it('adds approvers who are in userIds param', async () => {
      const report = await createOrUpdate({
        ...submittedReport,
        owner: { userId: mockUserTwo.id },
        approvers: [{ userId: mockManager.id }, { userId: secondMockManager.id }],
      });
      const result = await syncReportApprovers(
        report.id,
        [{ userId: mockManager.id }, { userId: secondMockManager.id }],
      );
      expect(result.length).toBe(2);
    });
    it('destroys approvers who are not in userIds param, restores them if added later', async () => {
      const report = await createOrUpdate({
        ...submittedReport,
        owner: { userId: mockUserTwo.id },
        approvers: [
          { userId: mockManager.id },
          {
            userId: secondMockManager.id,
            status: APPROVER_STATUSES.NEEDS_ACTION,
            note: 'do x, y, x',
          },
        ],
      });
      // remove mockManager
      const afterRemove = await syncReportApprovers(report.id, []);
      // check removed
      expect(afterRemove.length).toBe(0);
      // restore
      const afterRestore = await syncReportApprovers(
        report.id,
        [{ userId: mockManager.id }, { userId: secondMockManager.id }],
      );
      // check restored
      expect(afterRestore.length).toBe(2);
      const approverIds = afterRestore.map((a) => a.userId);
      expect(approverIds).toContain(secondMockManager.id);
      expect(approverIds).toContain(mockManager.id);
      const mgrWithStatus = afterRestore.find((manager) => manager.userId === secondMockManager.id);
      expect(mgrWithStatus.status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
    });
  });
});
