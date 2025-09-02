import { Request, Response } from 'express';
import { getReports, getReport } from './handlers';
import * as CRServices from '../../services/collabReports';
import { currentUserId } from '../../services/currentUser';
import { setReadRegions } from '../../services/accessValidation';
import handleErrors from '../../lib/apiErrorHandler';

jest.mock('../../services/collabReports');
jest.mock('../../services/currentUser');
jest.mock('../../services/accessValidation');
jest.mock('../../lib/apiErrorHandler');

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
      mockRequest.params = { id: '1' };
    });

    it('should return HTTP 200 and payload when report is found by ID', async () => {
      const mockReports = {
        count: 2,
        rows: [
          { id: '1', name: 'Report 1' },
          { id: '2', name: 'Report 2' },
        ],
      };

      (getReports as jest.Mock).mockResolvedValue(mockReports);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockJson).toHaveBeenCalledWith({ id: '1', name: 'Report 1' });
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when report with specified ID is not found', async () => {
      const mockReports = {
        count: 1,
        rows: [
          { id: '2', name: 'Report 2' },
        ],
      };

      (getReports as jest.Mock).mockResolvedValue(mockReports);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when no reports exist', async () => {
      const mockReports = {
        count: 0,
        rows: [],
      };

      (getReports as jest.Mock).mockResolvedValue(mockReports);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when service returns null', async () => {
      (getReports as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle missing request params gracefully', async () => {
      mockRequest.params = {};
      const mockReports = {
        count: 1,
        rows: [{ id: '1', name: 'Report 1' }],
      };

      (getReports as jest.Mock).mockResolvedValue(mockReports);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
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
});
