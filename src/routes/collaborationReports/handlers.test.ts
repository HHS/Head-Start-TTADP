import { Request, Response } from 'express';
import { getReports, getReport } from './handlers';
import * as mailer from '../../lib/mailer';
import {
  collabReportById,
  getReports as getReportsService,
} from '../../services/collabReports';
import * as currentUser from '../../services/currentUser';
import * as users from '../../services/users';
import CollabReportPolicy from '../../policies/collabReport';

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
      mockRequest.params = { collabReportId: '1' };
      (currentUser.currentUserId as jest.Mock).mockResolvedValue(1);
      (users.userById as jest.Mock).mockResolvedValue({ id: 1 });
      (CollabReportPolicy as jest.Mock).mockImplementation(() => ({
        canGet: () => true,
      }));
    });

    it('should return HTTP 200 and payload when report is found by ID', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        toJSON: () => ({ id: '1', name: 'Report 1' }),
      };

      (collabReportById as jest.Mock).mockResolvedValue(mockReport);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(collabReportById).toHaveBeenCalledWith('1');
      expect(mockJson).toHaveBeenCalledWith({ id: '1', name: 'Report 1' });
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when report with specified ID is not found', async () => {
      (collabReportById as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 403 when user cannot access report', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        toJSON: () => ({ id: '1', name: 'Report 1' }),
      };
      (collabReportById as jest.Mock).mockResolvedValue(mockReport);
      (CollabReportPolicy as jest.Mock).mockImplementation(() => ({
        canGet: () => false,
      }));

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(403);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when service returns null', async () => {
      (collabReportById as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(collabReportById).toHaveBeenCalledWith('1');
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle missing request params gracefully', async () => {
      mockRequest.params = {};
      (collabReportById as jest.Mock).mockResolvedValue(null);

      await getReport(mockRequest as Request, mockResponse as Response);

      expect(collabReportById).toHaveBeenCalledWith(undefined);
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

      (getReportsService as jest.Mock).mockResolvedValue(mockReports);
      await getReports(mockRequest as Request, mockResponse as Response);

      expect(getReportsService).toHaveBeenCalledTimes(1);
      expect(mockJson).toHaveBeenCalledWith(mockReports);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('Should return HTTP 404 when no reports are found', async () => {
      (getReportsService as jest.Mock).mockResolvedValue(null);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(getReportsService).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('Should return HTTP 404 when service returns undefined', async () => {
      (getReportsService as jest.Mock).mockResolvedValue(undefined);

      await getReports(mockRequest as Request, mockResponse as Response);

      expect(getReportsService).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });
  });
});
