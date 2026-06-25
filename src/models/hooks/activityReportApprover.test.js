import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import { NOTIFICATION_TYPES } from '../../constants';
import {
  ActivityReport,
  ActivityReportApprover,
  Notification,
  NotificationUserState,
  sequelize,
  User,
} from '..';
import {
  afterDestroy,
  afterRestore,
  afterUpdate,
  calculateReportStatusFromApprovals,
} from './activityReportApprover';

import { approverUserIds, draftObject, mockApprovers } from './testHelpers';

describe('activityReportApprover hooks', () => {
  const mockUserIds = approverUserIds();
  const mockUsers = mockApprovers(mockUserIds);

  beforeAll(async () => {
    await User.bulkCreate(mockUsers);
  });

  afterAll(async () => {
    await User.destroy({ where: { id: mockUserIds } });
    await sequelize.close();
  });

  describe('calculateReportStatusFromApprovals', () => {
    it('should return APPROVED if all approvers are APPROVED', () => {
      const approverStatuses = [
        APPROVER_STATUSES.APPROVED,
        APPROVER_STATUSES.APPROVED,
        APPROVER_STATUSES.APPROVED,
      ];
      const result = calculateReportStatusFromApprovals(approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.APPROVED);
    });

    it('should return NEEDS_ACTION if any approval is NEEDS_ACTION', () => {
      const approverStatuses = [
        APPROVER_STATUSES.APPROVED,
        APPROVER_STATUSES.NEEDS_ACTION,
        APPROVER_STATUSES.APPROVED,
      ];
      const result = calculateReportStatusFromApprovals(approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.NEEDS_ACTION);
    });

    it('should otherwise return submitted', () => {
      const approverStatuses = [APPROVER_STATUSES.SUBMITTED];
      const result = calculateReportStatusFromApprovals(approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.SUBMITTED);
    });
  });

  describe('afterDestroy', () => {
    it('updates the calculated status of the report after approval destruction', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterDestroy(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);

      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });

      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it("otherwise, it doesn't update the calculated status of the report", async () => {
      const ar = await ActivityReport.create({ ...draftObject });

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterDestroy(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

      await ActivityReport.destroy({ where: { id: ar.id } });
    });
  });

  describe('afterRestore', () => {
    it('updates the calculated status of the report after approval restoration', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterRestore(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);

      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });

      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it("otherwise, it doesn't update the calculated status of the report", async () => {
      const ar = await ActivityReport.create({ ...draftObject });

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterRestore(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it('archives ACTIVITY_REPORT_SUBMITTED notifications when report transitions to APPROVED on restore', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const notification = await Notification.create({
        entityId: ar.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });

      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockUserIds[0],
        archivedAt: null,
      });

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterRestore(sequelize, mockInstance);

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      expect(updatedUserState.archivedAt).not.toBeNull();

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });
      await NotificationUserState.destroy({ where: { id: userState.id } });
      await Notification.destroy({ where: { id: notification.id } });
      await ActivityReport.destroy({ where: { id: ar.id } });
    });
  });

  describe('afterUpdate', () => {
    it('updates the calculated status of the report after approval restoration', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);

      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });

      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it("otherwise, it doesn't update the calculated status of the report", async () => {
      const ar = await ActivityReport.create({ ...draftObject });

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it('archives ACTIVITY_REPORT_SUBMITTED notifications when report transitions to APPROVED', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const notification = await Notification.create({
        entityId: ar.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });

      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockUserIds[0],
        archivedAt: null,
      });

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      expect(updatedUserState.archivedAt).not.toBeNull();

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });
      await NotificationUserState.destroy({ where: { id: userState.id } });
      await Notification.destroy({ where: { id: notification.id } });
      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it('does not archive notifications when report is not fully approved', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const notification = await Notification.create({
        entityId: ar.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });

      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockUserIds[0],
        archivedAt: null,
      });

      // Only one approver approved — not all, so report stays SUBMITTED
      const approvals = [
        { activityReportId: ar.id, userId: mockUserIds[0], status: APPROVER_STATUSES.APPROVED },
        { activityReportId: ar.id, userId: mockUserIds[1], status: null },
        { activityReportId: ar.id, userId: mockUserIds[2], status: null },
      ];

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      expect(updatedUserState.archivedAt).toBeNull();

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });
      await NotificationUserState.destroy({ where: { id: userState.id } });
      await Notification.destroy({ where: { id: notification.id } });
      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it('does not re-archive notifications that are already archived', async () => {
      const ar = await ActivityReport.create({
        ...draftObject,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const notification = await Notification.create({
        entityId: ar.id,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      });

      const originalArchivedAt = '2020-01-01';
      const userState = await NotificationUserState.create({
        notificationId: notification.id,
        userId: mockUserIds[0],
        archivedAt: originalArchivedAt,
      });

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockInstance = {
        activityReportId: ar.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedUserState = await NotificationUserState.findByPk(userState.id);
      // archivedAt should remain the original value (the where clause excludes already-archived)
      expect(updatedUserState.archivedAt).toEqual(originalArchivedAt);

      await ActivityReportApprover.destroy({ where: { activityReportId: ar.id }, force: true });
      await NotificationUserState.destroy({ where: { id: userState.id } });
      await Notification.destroy({ where: { id: notification.id } });
      await ActivityReport.destroy({ where: { id: ar.id } });
    });
  });
});
