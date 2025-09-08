import { Request, Response } from 'express';
import { getReports, getReport } from './handlers';
import * as mailer from '../../lib/mailer';
import * as CRServices from '../../services/collabReports';

jest.mock('../../services/collabReports');
jest.mock('../../lib/mailer');
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
    it('should return payload when reports are found', async () => {
      const mockReports = {
        count: 2,
        rows: [
          { id: '1', name: 'Report 1' },
          { id: '2', name: 'Report 2' },
        ],
      };

      (getReports as jest.Mock).mockReturnValue(mockReports);
      await getReports(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockJson).toHaveBeenCalledWith(mockReports);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('Should return HTTP 404 when no reports are found', async () => {
      (getReports as jest.Mock).mockResolvedValue(null);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('Should return HTTP 404 when service returns undefined', async () => {
      (getReports as jest.Mock).mockResolvedValue(undefined);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(getReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });
  });
});
