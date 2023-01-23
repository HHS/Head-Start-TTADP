import { APPROVER_STATUSES, REPORT_STATUSES } from '../../constants';
import {
  calculateReportStatusFromApprovals,
  afterDestroy,
  afterRestore,
  afterUpsert,
  afterUpdate,
} from './activityReportApprover';

describe('activityReportApprover hooks', () => {
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
      const mockActivityReportUpdate = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.SUBMITTED })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => [
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
            ]),
          },
        },
      };

      const mockInstance = {
        activityReportId: 1,
      };

      await afterDestroy(mockSequelize, mockInstance);

      expect(mockActivityReportUpdate).toHaveBeenCalledWith(
        { calculatedStatus: REPORT_STATUSES.APPROVED },
        {
          where: { id: 1 },
          individualHooks: true,
        },
      );
    });

    it('otherwise, it doesn\'t update the calculated status of the report', async () => {
      const mockActivityReportUpdate = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.DRAFT })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => []),
          },
        },
      };

      const mockInstance = {
        activityReportId: 1,
      };

      await afterDestroy(mockSequelize, mockInstance);

      expect(mockActivityReportUpdate).not.toHaveBeenCalled();
    });
  });

  describe('afterRestore', () => {
    it('updates the calculated status of the report after approval destruction', async () => {
      const mockActivityReportUpdate = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.SUBMITTED })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => [
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
            ]),
          },
        },
      };

      const mockInstance = {
        activityReportId: 1,
      };

      await afterRestore(mockSequelize, mockInstance);

      expect(mockActivityReportUpdate).toHaveBeenCalledWith(
        { calculatedStatus: REPORT_STATUSES.APPROVED },
        {
          where: { id: 1 },
          individualHooks: true,
        },
      );
    });

    it('otherwise, it doesn\'t update the calculated status of the report', async () => {
      const mockActivityReportUpdate = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.DRAFT })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => []),
          },
        },
      };

      const mockInstance = {
        activityReportId: 1,
      };

      await afterRestore(mockSequelize, mockInstance);

      expect(mockActivityReportUpdate).not.toHaveBeenCalled();
    });
  });

  describe('afterUpdate', () => {
    it('updates the calculated status of the report after approval destruction', async () => {
      const mockActivityReportUpdate = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.SUBMITTED })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => [
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
              { status: APPROVER_STATUSES.APPROVED },
            ]),
          },
        },
      };

      const mockInstance = {
        activityReportId: 1,
      };

      await afterUpdate(mockSequelize, mockInstance);

      expect(mockActivityReportUpdate).toHaveBeenCalledWith(
        { calculatedStatus: REPORT_STATUSES.APPROVED },
        {
          where: { id: 1 },
          individualHooks: true,
        },
      );
    });

    it('otherwise, it doesn\'t update the calculated status of the report', async () => {
      const mockActivityReportUpdate = jest.fn();
      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.DRAFT })),
            update: mockActivityReportUpdate,
          },
          ActivityReportApprover: {
            findAll: jest.fn(() => []),
          },
        },
      };

      const mockInstance = {
        activityReportId: 1,
      };

      await afterUpdate(mockSequelize, mockInstance);

      expect(mockActivityReportUpdate).not.toHaveBeenCalled();
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
      const mockActivityReportUpdate = jest.fn();

      const mockSequelize = {
        models: {
          ActivityReport: {
            findByPk: jest.fn(() => ({ submissionStatus: REPORT_STATUSES.SUBMITTED })),
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

      expect(mockActivityReportUpdate).toHaveBeenCalledWith(
        { calculatedStatus: REPORT_STATUSES.APPROVED, approvedAt: expect.any(Date) },
        { where: { id: 1 }, individualHooks: true },
      );
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
