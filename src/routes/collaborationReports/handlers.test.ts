import { Request, Response } from 'express';
import {
  getReports,
  getReport,
  submitReport,
  reviewReport,
} from './handlers';
import * as CRServices from '../../services/collabReports';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { setReadRegions } from '../../services/accessValidation';
import handleErrors from '../../lib/apiErrorHandler';
import CollabReportPolicy from '../../policies/collabReport';
import { upsertApprover } from '../../services/collabReportApprovers';

jest.mock('../../services/collabReports');
jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../services/accessValidation');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../policies/collabReport');
jest.mock('../../services/collabReportApprovers');

describe('Collaboration Reports Handlers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockSendStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockSendStatus = jest.fn();

    mockRequest = {};
    mockResponse = {
      json: mockJson,
      sendStatus: mockSendStatus,
    };

    jest.clearAllMocks();
  });

  describe('getReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' };
      (currentUserId as jest.Mock).mockResolvedValue(123);
      (userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' });
      (CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>)
        .mockImplementation(() => ({
          canGet: jest.fn().mockReturnValue(true),
        }) as unknown as jest.Mocked<CollabReportPolicy>);
    });

    it('should return HTTP 200 and payload when report is found by ID', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        dataValues: { id: '1', name: 'Report 1' },
        displayId: 'COLLAB-001',
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockJson).toHaveBeenCalledWith({ id: '1', name: 'Report 1', displayId: 'COLLAB-001' });
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when report with specified ID is not found', async () => {
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
      expect(currentUserId).not.toHaveBeenCalled();
    });

    it('should return HTTP 403 when user is not authorized', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        dataValues: { id: '1', name: 'Report 1' },
        displayId: 'COLLAB-001',
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>)
        .mockImplementation(() => ({
          canGet: jest.fn().mockReturnValue(false),
        }) as unknown as jest.Mocked<CollabReportPolicy>);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(403);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when service returns null', async () => {
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle missing request params gracefully', async () => {
      mockRequest.params = {};
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith(undefined);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });
  });

  describe('getReports', () => {
    beforeEach(() => {
      mockRequest.query = {};
      (currentUserId as jest.Mock).mockResolvedValue(123);
      (setReadRegions as jest.Mock).mockResolvedValue({});
    });

    it('should return payload when reports are found', async () => {
      const mockReports = {
        count: 2,
        rows: [
          { id: '1', name: 'Report 1' },
          { id: '2', name: 'Report 2' },
        ],
      };

      (CRServices.getReports as jest.Mock).mockResolvedValue(mockReports);
      await getReports(mockRequest as Request, mockResponse as Response);

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse);
      expect(setReadRegions).toHaveBeenCalledWith({}, 123);
      expect(CRServices.getReports).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith(mockReports);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should return empty results when no reports are found', async () => {
      const mockReports = {
        count: 0,
        rows: [],
      };

      (CRServices.getReports as jest.Mock).mockResolvedValue(mockReports);
      await getReports(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(mockReports);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should pass query parameters through setReadRegions', async () => {
      mockRequest.query = {
        sortBy: 'createdAt',
        sortDir: 'asc',
        status: 'draft',
      };

      const filteredQuery = {
        sortBy: 'createdAt',
        sortDir: 'asc',
        status: 'draft',
        'region.in': [1, 2],
      };

      (setReadRegions as jest.Mock).mockResolvedValue(filteredQuery);
      (CRServices.getReports as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, 123);
      expect(CRServices.getReports).toHaveBeenCalledWith(filteredQuery);
    });

    it('should handle currentUserId errors', async () => {
      const error = new Error('Authentication failed');
      (currentUserId as jest.Mock).mockRejectedValue(error);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle setReadRegions errors', async () => {
      const error = new Error('Access validation failed');
      (setReadRegions as jest.Mock).mockRejectedValue(error);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      (CRServices.getReports as jest.Mock).mockRejectedValue(error);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle all steps successfully with complex query', async () => {
      mockRequest.query = {
        offset: '10',
        limit: '25',
        sortBy: 'title',
        sortDir: 'desc',
        status: 'approved',
      };

      const userId = 456;
      const filteredQuery = {
        offset: '10',
        limit: '25',
        sortBy: 'title',
        sortDir: 'desc',
        status: 'approved',
        'region.in': [3, 4, 5],
      };

      const mockReports = {
        count: 50,
        rows: Array.from({ length: 25 }, (_, i) => ({
          id: i + 11,
          title: `Report ${i + 11}`,
          status: 'approved',
        })),
      };

      (currentUserId as jest.Mock).mockResolvedValue(userId);
      (setReadRegions as jest.Mock).mockResolvedValue(filteredQuery);
      (CRServices.getReports as jest.Mock).mockResolvedValue(mockReports);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse);
      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, userId);
      expect(CRServices.getReports).toHaveBeenCalledWith(filteredQuery);
      expect(mockJson).toHaveBeenCalledWith(mockReports);
      expect(handleErrors).not.toHaveBeenCalled();
    });
  });

  describe('submitReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' };
      (currentUserId as jest.Mock).mockResolvedValue(123);
      (userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' });
      (CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>)
        .mockImplementation(() => ({
          canUpdate: jest.fn().mockReturnValue(true),
        }) as unknown as jest.Mocked<CollabReportPolicy>);
    });

    it('should successfully submit a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'draft',
        lastUpdatedById: 456,
      };

      const submittedReport = {
        ...mockReport,
        status: 'submitted',
        lastUpdatedById: 123,
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(submittedReport);

      await submitReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith({
        ...mockReport,
        lastUpdatedById: 123,
        status: 'submitted',
      }, mockReport);
      expect(mockJson).toHaveBeenCalledWith(submittedReport);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when report is not found', async () => {
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await submitReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled();
    });

    it('should return HTTP 403 when user is not authorized', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'draft',
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>)
        .mockImplementation(() => ({
          canUpdate: jest.fn().mockReturnValue(false),
        }) as unknown as jest.Mocked<CollabReportPolicy>);

      await submitReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(403);
      expect(mockJson).not.toHaveBeenCalled();
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      (CRServices.collabReportById as jest.Mock).mockRejectedValue(error);

      await submitReport(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
      expect(mockJson).not.toHaveBeenCalled();
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should handle missing collabReportId param', async () => {
      mockRequest.params = {};
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await submitReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith(undefined);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle createOrUpdateReport errors', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'draft',
      };
      const error = new Error('Update failed');

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (CRServices.createOrUpdateReport as jest.Mock).mockRejectedValue(error);

      await submitReport(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
    });
  });

  describe('reviewReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' };
      mockRequest.body = { status: 'approved', note: 'Looks good!' };
      (currentUserId as jest.Mock).mockResolvedValue(123);
      (userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' });
      (CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>)
        .mockImplementation(() => ({
          canUpdate: jest.fn().mockReturnValue(true),
        }) as unknown as jest.Mocked<CollabReportPolicy>);
    });

    it('should successfully review a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      };

      const mockApprover = {
        id: 1,
        status: 'approved',
        note: 'Looks good!',
        collabReportId: '1',
        userId: 123,
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (upsertApprover as jest.Mock).mockResolvedValue(mockApprover);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(upsertApprover).toHaveBeenCalledWith({
        status: 'approved',
        note: 'Looks good!',
        collabReportId: '1',
        userId: 123,
      });
      expect(mockJson).toHaveBeenCalledWith(mockApprover);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when report is not found', async () => {
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
      expect(upsertApprover).not.toHaveBeenCalled();
    });

    it('should return HTTP 403 when user is not authorized', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>)
        .mockImplementation(() => ({
          canUpdate: jest.fn().mockReturnValue(false),
        }) as unknown as jest.Mocked<CollabReportPolicy>);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(403);
      expect(mockJson).not.toHaveBeenCalled();
      expect(upsertApprover).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      (CRServices.collabReportById as jest.Mock).mockRejectedValue(error);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
      expect(mockJson).not.toHaveBeenCalled();
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should handle missing collabReportId param', async () => {
      mockRequest.params = {};
      (CRServices.collabReportById as jest.Mock).mockResolvedValue(null);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(CRServices.collabReportById).toHaveBeenCalledWith(undefined);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle upsertApprover errors', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      };
      const error = new Error('Approver upsert failed');

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (upsertApprover as jest.Mock).mockRejectedValue(error);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(handleErrors).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        error,
        { namespace: 'SERVICE:COLLAB_REPORTS' },
      );
    });

    it('should handle review with needs_action status', async () => {
      mockRequest.body = { status: 'needs_action', note: 'Please revise section 2' };

      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      };

      const mockApprover = {
        id: 1,
        status: 'needs_action',
        note: 'Please revise section 2',
        collabReportId: '1',
        userId: 123,
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (upsertApprover as jest.Mock).mockResolvedValue(mockApprover);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(upsertApprover).toHaveBeenCalledWith({
        status: 'needs_action',
        note: 'Please revise section 2',
        collabReportId: '1',
        userId: 123,
      });
      expect(mockJson).toHaveBeenCalledWith(mockApprover);
    });

    it('should handle review without note', async () => {
      mockRequest.body = { status: 'approved' };

      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      };

      const mockApprover = {
        id: 1,
        status: 'approved',
        note: undefined,
        collabReportId: '1',
        userId: 123,
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (upsertApprover as jest.Mock).mockResolvedValue(mockApprover);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(upsertApprover).toHaveBeenCalledWith({
        status: 'approved',
        note: undefined,
        collabReportId: '1',
        userId: 123,
      });
      expect(mockJson).toHaveBeenCalledWith(mockApprover);
    });

    it('should handle empty request body', async () => {
      mockRequest.body = {};

      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      };

      const mockApprover = {
        id: 1,
        status: undefined,
        note: undefined,
        collabReportId: '1',
        userId: 123,
      };

      (CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (upsertApprover as jest.Mock).mockResolvedValue(mockApprover);

      await reviewReport(mockRequest as Request, mockResponse as Response);

      expect(upsertApprover).toHaveBeenCalledWith({
        status: undefined,
        note: undefined,
        collabReportId: '1',
        userId: 123,
      });
      expect(mockJson).toHaveBeenCalledWith(mockApprover);
    });
  });
});
