import { REPORT_STATUSES } from '@ttahub/common';
import {
  CollabReportApprover,
  CollabReport,
  User,
  sequelize,
} from '../models';
import { upsertApprover } from './collabReportApprovers';

const userId = 11184161;

const mockUser = {
  id: userId,
  homeRegionId: 1,
  hsesUsername: 'user11184161',
  hsesUserId: 'user11184161',
  name: 'Test User',
  email: 'test.user@example.com',
  lastLogin: new Date(),
};

describe('collabReportApprovers service', () => {
  let user;
  let collabReport;

  beforeAll(async () => {
    await User.destroy({
      where: {
        id: userId,
      },
    });

    user = await User.create(mockUser);

    collabReport = await CollabReport.create({
      id: 999,
      name: 'Test Collab Report',
      regionId: 1,
      startDate: '2023-01-01',
      endDate: '2023-01-02',
      duration: 1,
      userId: user.id,
      conductMethod: ['email'],
      isStateActivity: false,
      description: 'Test collaboration report description',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
    });

    await CollabReportApprover.destroy({
      where: {
        collabReportId: collabReport.id,
      },
      force: true,
    });
  });

  afterEach(async () => {
    await CollabReportApprover.destroy({
      where: {
        collabReportId: collabReport.id,
      },
      force: true,
    });
  });

  afterAll(async () => {
    await CollabReport.destroy({
      where: {
        id: collabReport.id,
      },
      force: true,
    });
    await User.destroy({
      where: {
        id: userId,
      },
    });
    await sequelize.close();
  });

  describe('upsertApprover', () => {
    it('creates a new approver when none exists', async () => {
      const values = {
        collabReportId: collabReport.id,
        userId: user.id,
        status: 'needs_action',
        note: 'Test note',
      };

      const result = await upsertApprover(values);

      expect(result).toBeTruthy();
      expect(result.collabReportId).toBe(collabReport.id);
      expect(result.userId).toBe(user.id);
      expect(result.status).toBe('needs_action');
      expect(result.note).toBe('Test note');
    });

    it('updates an existing approver', async () => {
      const values = {
        collabReportId: collabReport.id,
        userId: user.id,
        status: 'needs_action',
        note: 'Initial note',
      };

      await CollabReportApprover.create(values);

      const updateValues = {
        collabReportId: collabReport.id,
        userId: user.id,
        status: 'approved',
        note: 'Updated note',
      };

      const result = await upsertApprover(updateValues);

      expect(result).toBeTruthy();
      expect(result.status).toBe('approved');
      expect(result.note).toBe(''); // cleared out on approval
    });

    it('restores a soft deleted approver', async () => {
      const values = {
        collabReportId: collabReport.id,
        userId: user.id,
        status: 'approved',
        note: 'Test note',
      };

      const approver = await CollabReportApprover.create(values);
      await approver.destroy();

      const result = await upsertApprover(values);

      expect(result).toBeTruthy();
      expect(result.deletedAt).toBeFalsy();
    });

    it('updates status when provided', async () => {
      const values = {
        collabReportId: collabReport.id,
        userId: user.id,
        status: 'needs_action',
      };

      await CollabReportApprover.create(values);

      const updateValues = {
        collabReportId: collabReport.id,
        userId: user.id,
        status: 'approved',
      };

      const result = await upsertApprover(updateValues);

      expect(result.status).toBe('approved');
    });

    it('updates note when provided', async () => {
      const values = {
        collabReportId: collabReport.id,
        userId: user.id,
        note: 'Initial note',
        status: 'needs_action',
      };

      await CollabReportApprover.create(values);

      const updateValues = {
        collabReportId: collabReport.id,
        userId: user.id,
        note: 'Updated note',
        status: 'needs_action',
      };

      const result = await upsertApprover(updateValues);

      expect(result.note).toBe('Updated note');
    });
  });
});
