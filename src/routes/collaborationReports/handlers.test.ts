import { Request, Response } from 'express';
import { getCollaborationReportsHandler, getCollaborationReportByIdHandler } from './handlers';
import { getCollaborationReports } from '../../services/collaborationReports';

jest.mock('../../services/collaborationReports');

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

  describe('getCollaborationReportsHandler', () => {
    it('should return payload when reports are found', async () => {
      const mockReports = {
        count: 2,
        rows: [
          { id: '1', name: 'Report 1' },
          { id: '2', name: 'Report 2' },
        ],
      };

      (getCollaborationReports as jest.Mock).mockReturnValue(mockReports);
      await getCollaborationReportsHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockJson).toHaveBeenCalledWith(mockReports);
      expect(mockSendStatus).not.toHaveBeenCalled();
    });

    it('Should return HTTP 404 when no reports are found', async () => {
      (getCollaborationReports as jest.Mock).mockResolvedValue(null);

      await getCollaborationReportsHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('Should return HTTP 404 when service returns undefined', async () => {
      (getCollaborationReports as jest.Mock).mockResolvedValue(undefined);

      await getCollaborationReportsHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });
  });

  describe('getCollaborationReportByIdHandler', () => {
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

      (getCollaborationReports as jest.Mock).mockResolvedValue(mockReports);

      await getCollaborationReportByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
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

      (getCollaborationReports as jest.Mock).mockResolvedValue(mockReports);

      await getCollaborationReportByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when no reports exist', async () => {
      const mockReports = {
        count: 0,
        rows: [],
      };

      (getCollaborationReports as jest.Mock).mockResolvedValue(mockReports);

      await getCollaborationReportByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should return HTTP 404 when service returns null', async () => {
      (getCollaborationReports as jest.Mock).mockResolvedValue(null);

      await getCollaborationReportByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });

    it('should handle missing request params gracefully', async () => {
      mockRequest.params = {};
      const mockReports = {
        count: 1,
        rows: [{ id: '1', name: 'Report 1' }],
      };

      (getCollaborationReports as jest.Mock).mockResolvedValue(mockReports);

      await getCollaborationReportByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(getCollaborationReports).toHaveBeenCalledTimes(1);
      expect(mockSendStatus).toHaveBeenCalledWith(404);
      expect(mockJson).not.toHaveBeenCalled();
    });
  });
});
