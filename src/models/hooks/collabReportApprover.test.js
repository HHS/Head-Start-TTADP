import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import {
  sequelize,
  User,
  CollabReport,
  CollabReportApprover,
} from '..';
import {
  calculateReportStatusFromApprovals,
  calculateReportStatus,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
} from './collabReportApprover';

import { mockApprovers, approverUserIds } from './testHelpers';

const mockCollabReport = {
  userId: 1,
  lastUpdatedById: 1,
  regionId: 1,
  name: 'Test Collaboration Report',
  submissionStatus: 'draft',
  calculatedStatus: null,
  startDate: '2024-01-15',
  endDate: '2024-01-20',
  duration: 5,
  isStateActivity: false,
  conductMethod: ['virtual'],
  description: 'This is a test collaboration report for testing purposes.',
};

describe('collabReportApprover hooks', () => {
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

    it('should return SUBMITTED for pending approvals', () => {
      const approverStatuses = [null, null, null];
      const result = calculateReportStatusFromApprovals(approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.SUBMITTED);
    });

    it('should return SUBMITTED for empty approvals array', () => {
      const approverStatuses = [];
      const result = calculateReportStatusFromApprovals(approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.SUBMITTED);
    });

    it('should return SUBMITTED for mixed pending and approved', () => {
      const approverStatuses = [
        APPROVER_STATUSES.APPROVED,
        null,
        APPROVER_STATUSES.APPROVED,
      ];
      const result = calculateReportStatusFromApprovals(approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.SUBMITTED);
    });
  });

  describe('calculateReportStatus', () => {
    it('should return NEEDS_ACTION when approver status is NEEDS_ACTION', () => {
      const approverStatuses = [APPROVER_STATUSES.APPROVED, APPROVER_STATUSES.APPROVED];
      const result = calculateReportStatus(APPROVER_STATUSES.NEEDS_ACTION, approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.NEEDS_ACTION);
    });

    it('should delegate to calculateReportStatusFromApprovals when not NEEDS_ACTION', () => {
      const approverStatuses = [
        APPROVER_STATUSES.APPROVED,
        APPROVER_STATUSES.APPROVED,
        APPROVER_STATUSES.APPROVED,
      ];
      const result = calculateReportStatus(APPROVER_STATUSES.APPROVED, approverStatuses);
      expect(result).toEqual(REPORT_STATUSES.APPROVED);
    });
  });

  describe('beforeCreate', () => {
    it('should purify fields before creation', async () => {
      const mockInstance = {
        note: '<script>alert("xss")</script>Clean note content',
        status: APPROVER_STATUSES.APPROVED,
        changed: () => ['note'],
        set: jest.fn((field, value) => { mockInstance[field] = value; }),
      };

      await beforeCreate(sequelize, mockInstance);

      expect(mockInstance.note).not.toContain('<script>');
      expect(mockInstance.note).toContain('Clean note content');
    });
  });

  describe('beforeUpdate', () => {
    it('should purify fields before update', async () => {
      const mockInstance = {
        note: '<img src="x" onerror="alert(1)">Safe content',
        status: APPROVER_STATUSES.NEEDS_ACTION,
        changed: () => ['note'],
        set: jest.fn((field, value) => { mockInstance[field] = value; }),
      };

      await beforeUpdate(sequelize, mockInstance);

      // DOMPurify removes dangerous attributes but keeps safe tags
      expect(mockInstance.note).not.toContain('onerror');
      expect(mockInstance.note).toContain('Safe content');
      expect(mockInstance.note).toContain('<img src="x">');
    });
  });

  describe('afterCreate', () => {
    it('updates the calculated status of the report after approval creation', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await CollabReportApprover.bulkCreate(approvals.slice(0, -1));

      const mockInstance = {
        collabReportId: cr.id,
        userId: mockUserIds[mockUserIds.length - 1],
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterCreate(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('sets status to NEEDS_ACTION when an approver needs action', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const mockInstance = {
        collabReportId: cr.id,
        userId: mockUserIds[0],
        status: APPROVER_STATUSES.NEEDS_ACTION,
      };

      await afterCreate(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('does not update status for draft reports', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.DRAFT,
      });

      const mockInstance = {
        collabReportId: cr.id,
        userId: mockUserIds[0],
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterCreate(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
      expect(updatedReport.calculatedStatus).toBeNull();

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('clears approver notes when report becomes approved', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      // Create approvers with notes
      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
        note: `Note from user ${userId}`,
      }));

      await CollabReportApprover.bulkCreate(approvals.slice(0, -1));

      const mockInstance = {
        collabReportId: cr.id,
        userId: mockUserIds[mockUserIds.length - 1],
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterCreate(sequelize, mockInstance);

      const approvers = await CollabReportApprover.findAll({
        where: { collabReportId: cr.id },
      });

      approvers.forEach((approver) => {
        expect(approver.note).toBe('');
      });

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });
  });

  describe('afterDestroy', () => {
    it('updates the calculated status of the report after approval destruction', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await CollabReportApprover.bulkCreate(approvals);

      // Remove one approval
      await CollabReportApprover.destroy({
        where: { collabReportId: cr.id, userId: mockUserIds[0] },
      });

      const mockInstance = {
        collabReportId: cr.id,
      };

      await afterDestroy(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      // Should still be approved since remaining approvers are approved
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('changes status from approved to submitted when removing approvals', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      // Create one approval
      const approval = {
        collabReportId: cr.id,
        userId: mockUserIds[0],
        status: APPROVER_STATUSES.APPROVED,
      };

      const createdApproval = await CollabReportApprover.create(approval);
      await CollabReportApprover.destroy({ where: { id: createdApproval.id } });

      const mockInstance = {
        collabReportId: cr.id,
      };

      await afterDestroy(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('does not update status for non-submitted reports', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.DRAFT,
      });

      const mockInstance = {
        collabReportId: cr.id,
      };

      await afterDestroy(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
      expect(updatedReport.calculatedStatus).toBeNull();

      await CollabReport.destroy({ where: { id: cr.id } });
    });
  });

  describe('afterRestore', () => {
    it('updates the calculated status of the report after approval restoration', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await CollabReportApprover.bulkCreate(approvals);

      const mockInstance = {
        collabReportId: cr.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterRestore(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('does not update status for draft reports', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.DRAFT,
      });

      const mockInstance = {
        collabReportId: cr.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterRestore(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
      expect(updatedReport.calculatedStatus).toBeNull();

      await CollabReport.destroy({ where: { id: cr.id } });
    });
  });

  describe('afterUpdate', () => {
    it('updates the calculated status of the report after approval update', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await CollabReportApprover.bulkCreate(approvals);

      const mockInstance = {
        collabReportId: cr.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('changes status to NEEDS_ACTION when approver requests changes', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await CollabReportApprover.bulkCreate(approvals);

      const mockInstance = {
        collabReportId: cr.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('does not update status for draft reports', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.DRAFT,
      });

      const mockInstance = {
        collabReportId: cr.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedReport = await CollabReport.findByPk(cr.id);
      expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT);
      expect(updatedReport.calculatedStatus).toBeNull();

      await CollabReport.destroy({ where: { id: cr.id } });
    });

    it('clears notes when all approvers approve', async () => {
      const cr = await CollabReport.create({
        ...mockCollabReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });

      // Create approvers with notes, all but one approved
      const approvals = mockUserIds.map((userId) => ({
        collabReportId: cr.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
        note: `Note from user ${userId}`,
      }));

      await CollabReportApprover.bulkCreate(approvals);

      const mockInstance = {
        collabReportId: cr.id,
        status: APPROVER_STATUSES.APPROVED,
      };

      await afterUpdate(sequelize, mockInstance);

      const approvers = await CollabReportApprover.findAll({
        where: { collabReportId: cr.id },
      });

      approvers.forEach((approver) => {
        expect(approver.note).toBe('');
      });

      await CollabReportApprover.destroy({ where: { collabReportId: cr.id }, force: true });
      await CollabReport.destroy({ where: { id: cr.id } });
    });
  });
});
