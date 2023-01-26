import { APPROVER_STATUSES, REPORT_STATUSES } from '../../constants';
import {
  sequelize,
  User,
  ActivityReport,
  ActivityReportApprover,
} from '..';
import {
  calculateReportStatusFromApprovals,
  afterDestroy,
  afterRestore,
  afterUpsert,
  afterUpdate,
} from './activityReportApprover';

import { draftObject, mockApprovers, approverUserIds } from './testHelpers';

describe('activityReportApprover hooks', () => {
  const mockUserIds = approverUserIds;
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
      const ar = await ActivityReport.create(
        { ...draftObject, submissionStatus: REPORT_STATUSES.SUBMITTED },
      );

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

    it('otherwise, it doesn\'t update the calculated status of the report', async () => {
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
      const ar = await ActivityReport.create(
        { ...draftObject, submissionStatus: REPORT_STATUSES.SUBMITTED },
      );

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

    it('otherwise, it doesn\'t update the calculated status of the report', async () => {
      const ar = await ActivityReport.create({ ...draftObject });

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterRestore(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

      await ActivityReport.destroy({ where: { id: ar.id } });
    });
  });

  describe('afterUpdate', () => {
    it('updates the calculated status of the report after approval restoration', async () => {
      const ar = await ActivityReport.create(
        { ...draftObject, submissionStatus: REPORT_STATUSES.SUBMITTED },
      );

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

    it('otherwise, it doesn\'t update the calculated status of the report', async () => {
      const ar = await ActivityReport.create({ ...draftObject });

      const mockInstance = {
        activityReportId: ar.id,
      };

      await afterUpdate(sequelize, mockInstance);

      const updatedReport = await ActivityReport.findByPk(ar.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

      await ActivityReport.destroy({ where: { id: ar.id } });
    });
  });

  describe('afterUpsert', () => {
    it('fails fast if there is no instance', async () => {
      const mockActivityReportFindByPk = jest.fn();
      const mockActivityReportApproverFindAll = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: mockActivityReportFindByPk,

          },
          ActivityReportApprover: {
            findAll: mockActivityReportApproverFindAll,
          },
        },
      };

      const mockCreated = [];

      await afterUpsert(mockSequelize, mockCreated);

      expect(mockActivityReportFindByPk).not.toHaveBeenCalled();
    });

    it('calculates status after upsert', async () => {
      const ar = await ActivityReport.create(
        { ...draftObject, submissionStatus: REPORT_STATUSES.SUBMITTED },
      );

      const approvals = mockUserIds.map((userId) => ({
        activityReportId: ar.id,
        userId,
        status: APPROVER_STATUSES.APPROVED,
      }));

      await ActivityReportApprover.bulkCreate(approvals);

      const mockCreated = [{
        activityReportId: ar.id,
      }];

      await afterUpsert(sequelize, mockCreated);
      const updatedReport = await ActivityReport.findByPk(ar.id);
      expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);
    });
    it('doesn\'t calculate status if the report is not submitted', async () => {
      const mockActivityReportUpdate = jest.fn();

      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.DRAFT })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => ([
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
            ])),
          },
        },
      };

      const mockCreated = [{
        activityReportId: 1,
      }];

      await afterUpsert(mockSequelize, mockCreated);

      expect(mockActivityReportUpdate).not.toHaveBeenCalled();
    });
  });
});
