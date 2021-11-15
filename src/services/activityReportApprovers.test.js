import db, {
  ActivityReport, ActivityReportApprover, User, sequelize,
} from '../models';
import { upsertApprover, syncApprovers } from './activityReportApprovers';
import { activityReportById } from './activityReports';
import { APPROVER_STATUSES, REPORT_STATUSES } from '../constants';

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
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
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
    await ActivityReportApprover.destroy({
      where: { activityReportId: reportIds },
      force: true,
    });
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
        await sequelize.transaction(async (transaction) => {
          // Pending updated to needs_action
          const approver = await upsertApprover({
            status: APPROVER_STATUSES.NEEDS_ACTION,
            activityReportId: report1.id,
            userId: secondMockManager.id,
          }, transaction);
          expect(approver.status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
        });
        const updatedReport = await activityReportById(report1.id);
        expect(updatedReport.approvedAt).toBeNull();
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
        const updatedReport = await activityReportById(report2.id);
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
        const updatedReport = await activityReportById(report3.id);
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
        const updatedReport = await activityReportById(report4.id);
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);
        // Soft delete needs_action
        await ActivityReportApprover.destroy({ where: needsActionApproval, individualHooks: true });
        const afterDeleteReport = await activityReportById(report4.id);
        expect(afterDeleteReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);
        // Upsert restores needs_action
        await upsertApprover(needsActionApproval);
        const afterRestoreReport = await activityReportById(report4.id);
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
        const updatedReport = await activityReportById(report.id);
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
      await ActivityReportApprover.bulkCreate([{
        activityReportId: report.id,
        userId: mockManager.id,
      }, {
        activityReportId: report.id,
        userId: secondMockManager.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
        note: 'do x, y, x',
      }]);
      // remove mockManager
      const afterRemove = await syncApprovers(report.id);
      // check removed
      expect(afterRemove.length).toBe(0);
      // restore
      const afterRestore = await syncApprovers(report.id, [mockManager.id, secondMockManager.id]);
      // check restored
      expect(afterRestore.length).toBe(2);
      expect(afterRestore[0].userId).toBe(secondMockManager.id);
      expect(afterRestore[0].status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
    });
  });
});
