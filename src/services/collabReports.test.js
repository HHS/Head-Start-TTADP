import { REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import db from '../models';
import filtersToScopes from '../scopes';
import { getReports } from './collabReports';

jest.mock('../models');
jest.mock('../scopes');

const {
  CollabReport,
  CollabReportApprover,
  CollabReportSpecialist,
  User,
} = db;

describe('collabReports service', () => {
  describe('getReports', () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      fullName: 'Test User Full Name',
    };

    const mockSpecialist = {
      id: 1,
      collabReportId: 1,
      userId: 1,
      user: mockUser,
    };

    const mockApprover = {
      id: 1,
      status: 'approved',
      note: 'Test note',
      user: mockUser,
    };

    const mockReport = {
      id: 1,
      title: 'Test Report',
      status: REPORT_STATUSES.APPROVED,
      updatedAt: '2023-01-01',
      author: mockUser,
      collabReportSpecialists: [mockSpecialist],
      approvers: [mockApprover],
    };

    const mockFindAndCountAllResult = {
      rows: [mockReport],
      count: 1,
    };

    beforeEach(() => {
      jest.clearAllMocks();

      CollabReport.findAndCountAll.mockResolvedValue(mockFindAndCountAllResult);
      filtersToScopes.mockResolvedValue({ collabReports: {} });
    });

    it('should return reports with default parameters', async () => {
      const result = await getReports();

      expect(filtersToScopes).toHaveBeenCalledWith({}, { userId: 0 });
      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith({
        where: {
          [Op.and]: [
            { status: REPORT_STATUSES.APPROVED },
            {},
          ],
        },
        include: [
          {
            model: User,
            as: 'author',
            required: false,
          },
          {
            model: CollabReportSpecialist,
            as: 'collabReportSpecialists',
            required: false,
            separate: true,
            include: [
              {
                model: User,
                as: 'user',
              },
            ],
          },
          {
            model: CollabReportApprover,
            attributes: ['id', 'status', 'note'],
            as: 'approvers',
            required: false,
            separate: true,
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'fullName'],
              },
            ],
          },
        ],
        order: [['updatedAt', 'desc']],
      });
      expect(result).toEqual(mockFindAndCountAllResult);
    });

    it('should handle custom sort parameters', async () => {
      await getReports({
        sortBy: 'createdAt',
        sortDir: 'asc',
      });

      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'asc']],
        }),
      );
    });

    it('should handle pagination parameters', async () => {
      await getReports({
        offset: 20,
        limit: 5,
      });

      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          include: expect.any(Array),
          order: expect.any(Array),
        }),
      );
    });

    it('should handle custom status parameter', async () => {
      await getReports({
        status: REPORT_STATUSES.DRAFT,
      });

      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.and]: [
              { status: REPORT_STATUSES.DRAFT },
              {},
            ],
          },
        }),
      );
    });

    it('should handle array of statuses', async () => {
      const statuses = [REPORT_STATUSES.DRAFT, REPORT_STATUSES.APPROVED];
      await getReports({
        status: statuses,
      });

      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.and]: [
              { status: statuses },
              {},
            ],
          },
        }),
      );
    });

    it('should handle userId parameter', async () => {
      const userId = 123;
      await getReports({
        userId,
      });

      expect(filtersToScopes).toHaveBeenCalledWith({}, { userId });
    });

    it('should handle additional filters', async () => {
      const filters = {
        region: [1, 2],
        startDate: '2023-01-01',
      };

      await getReports(filters);

      expect(filtersToScopes).toHaveBeenCalledWith(
        { region: [1, 2], startDate: '2023-01-01' },
        { userId: 0 },
      );
    });

    it('should handle complex filter scenarios', async () => {
      const complexScopes = { someComplexScope: { id: { [Op.in]: [1, 2, 3] } } };
      filtersToScopes.mockResolvedValue({ collabReports: complexScopes });

      await getReports({
        userId: 456,
        region: [1],
        status: REPORT_STATUSES.SUBMITTED,
      });

      expect(filtersToScopes).toHaveBeenCalledWith(
        { region: [1] },
        { userId: 456 },
      );
      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.and]: [
              { status: REPORT_STATUSES.SUBMITTED },
              complexScopes,
            ],
          },
        }),
      );
    });

    it('should handle all parameters together', async () => {
      await getReports({
        sortBy: 'title',
        sortDir: 'asc',
        offset: 10,
        limit: 25,
        status: REPORT_STATUSES.NEEDS_ACTION,
        userId: 789,
        region: [3, 4],
        startDate: '2023-06-01',
      });

      expect(filtersToScopes).toHaveBeenCalledWith(
        { region: [3, 4], startDate: '2023-06-01' },
        { userId: 789 },
      );
      expect(CollabReport.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.and]: [
              { status: REPORT_STATUSES.NEEDS_ACTION },
              {},
            ],
          },
          order: [['title', 'asc']],
        }),
      );
    });

    it('should handle empty filter results', async () => {
      CollabReport.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await getReports();

      expect(result).toEqual({ rows: [], count: 0 });
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      CollabReport.findAndCountAll.mockRejectedValue(dbError);

      await expect(getReports()).rejects.toThrow('Database connection failed');
    });

    it('should propagate filtersToScopes errors', async () => {
      const scopeError = new Error('Invalid filter scope');
      filtersToScopes.mockRejectedValue(scopeError);

      await expect(getReports()).rejects.toThrow('Invalid filter scope');
    });
  });
});
