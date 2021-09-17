import { checkActivityReportIdParam, checkReportIdParam, checkFileIdParam } from './checkIdParamMiddleware';
import { auditLogger } from '../logger';

jest.mock('../lib/apiErrorHandler', () => jest.fn().mockReturnValue(() => Promise.resolve()));
jest.mock('../logger');

const mockResponse = {
  status: jest.fn(() => ({
    send: jest.fn(),
  })),
};
const mockNext = jest.fn();
const errorMessage = 'Received malformed request params';

describe('checkIdParamMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkActivityReportIdParam', () => {
    it('calls next if activity report is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          activityReportId: '10',
        },
      };

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('throw 400 if activity report is not string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          activityReportId: '1#0',
        },
      };

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: activityReportId 1#0`);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('throw 400 if activity report param is missing', () => {
      const mockRequest = { path: '/api/endpoint' };

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: activityReportId undefined`);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkFileIdParam', () => {
    it('calls next if file id is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1',
        },
      };

      checkFileIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('throw 400 if param is not string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1x',
        },
      };

      checkFileIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: fileId 1x`);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          reportId: '1',
        },
      };

      checkFileIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: fileId undefined`);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkReportIdParam', () => {
    it('calls next if report id is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1',
          reportId: '2',
        },
      };

      checkReportIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('throw 400 if param is not string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          reportId: '1x',
        },
      };

      checkReportIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: reportId 1x`);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1',
        },
      };

      checkReportIdParam(mockRequest, mockResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: reportId undefined`);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
