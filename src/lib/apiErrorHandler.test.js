import Sequelize from 'sequelize';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import db, { RequestErrors } from '../models';
import handleErrors, {
  handleUnexpectedErrorInCatchBlock,
  handleWorkerErrors,
  handleUnexpectedWorkerError,
  logRequestError,
  handleWorkerError,
  logWorkerError,
} from './apiErrorHandler';
import { auditLogger as logger } from '../logger';

const mockUser = {
  id: 47,
  name: 'Joe Green',
  title: null,
  phoneNumber: '555-555-554',
  hsesUserId: '331687',
  email: 'test@test.com',
  homeRegionId: 1,
  permissions: [],
  lastLogin: new Date(),
};
const mockSession = jest.fn();
mockSession.userId = mockUser.id;
const mockRequest = {
  path: '/api/user',
  method: 'PUT',
  session: mockSession,
  body: mockUser,
};

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockJob = {
  data: { jobDetail: 'example job detail' },
  queue: { name: 'exampleQueue' },
};

const mockSequelizeError = new Sequelize.Error('Not all ok here');

const mockLogContext = {
  namespace: 'TEST',
};

jest.mock('../logger', () => ({
  auditLogger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('apiErrorHandler plus worker', () => {
  describe('apiErrorHandler', () => {
    beforeEach(async () => {
      await RequestErrors.destroy({ where: {} });
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await RequestErrors.destroy({ where: {} });
      await db.sequelize.close();
    });

    it('handles a sequelize error', async () => {
      await handleErrors(mockRequest, mockResponse, mockSequelizeError, mockLogContext);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).not.toBe(0);
      expect(requestErrors[0].operation).toBe('SequelizeError');
    });

    it('handles a generic error', async () => {
      const mockGenericError = new Error('Unknown error');
      await handleErrors(mockRequest, mockResponse, mockGenericError, mockLogContext);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).not.toBe(0);
      expect(requestErrors[0].operation).toBe('UNEXPECTED_ERROR');
    });

    it('handles unexpected error in catch block', async () => {
      const mockUnexpectedErr = new Error('Unexpected error');
      handleUnexpectedErrorInCatchBlock(
        mockRequest,
        mockResponse,
        mockUnexpectedErr,
        mockLogContext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).toBe(0);
    });

    it('handles error suppression when SUPPRESS_ERROR_LOGGING is true', async () => {
      process.env.SUPPRESS_ERROR_LOGGING = 'true';
      const mockGenericError = new Error('Unknown error');
      await handleErrors(mockRequest, mockResponse, mockGenericError, mockLogContext);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).toBe(0);

      delete process.env.SUPPRESS_ERROR_LOGGING;
    });

    it('handles worker errors', async () => {
      const mockWorkerError = new Error('Worker error');
      await handleWorkerErrors(mockJob, mockWorkerError, mockLogContext);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).not.toBe(0);
      expect(requestErrors[0].operation).toBe('UNEXPECTED_ERROR');
    });

    it('handles worker Sequelize errors', async () => {
      const mockSequelizeWorkerError = new Sequelize.Error('Sequelize worker error');
      await handleWorkerErrors(mockJob, mockSequelizeWorkerError, mockLogContext);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).not.toBe(0);
      expect(requestErrors[0].operation).toBe('SequelizeError');
    });

    it('handles unexpected worker error in catch block', async () => {
      const mockUnexpectedWorkerError = new Error('Unexpected worker error');
      handleUnexpectedWorkerError(mockJob, mockUnexpectedWorkerError, mockLogContext);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).toBe(0);
    });

    it('handles null error', async () => {
      await handleErrors(mockRequest, mockResponse, null, mockLogContext);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).toBe(0);
    });

    it('handles undefined error', async () => {
      await handleErrors(mockRequest, mockResponse, undefined, mockLogContext);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).toBe(0);
    });

    it('handles specific Sequelize connection acquire timeout error', async () => {
      const mockConnAcquireTimeoutError = new Sequelize.ConnectionAcquireTimeoutError(
        'Connection acquire timeout error',
      );

      await expect(
        handleErrors(mockRequest, mockResponse, mockConnAcquireTimeoutError, mockLogContext),
      ).rejects.toThrow(
        'Unhandled ConnectionAcquireTimeoutError: Restarting server due to database connection acquisition timeout.',
      );

      await expect(
        handleWorkerErrors(mockJob, mockConnAcquireTimeoutError, mockLogContext),
      ).rejects.toThrow(
        'Unhandled ConnectionAcquireTimeoutError: Restarting server due to database connection acquisition timeout.',
      );

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

      const requestErrors = await RequestErrors.findAll();

      expect(requestErrors.length).toBe(0);
    });

    it('should return 0 when SUPPRESS_ERROR_LOGGING is true and operation is not SequelizeError', async () => {
      process.env.SUPPRESS_ERROR_LOGGING = 'true';
      const mockError = new Error('Test error');

      const result = await logWorkerError(mockJob, 'UNEXPECTED_ERROR', mockError, mockLogContext);

      expect(result).toBe(0);

      delete process.env.SUPPRESS_ERROR_LOGGING;
    });

    it('should return 0 when error is null', async () => {
      const result = await logWorkerError(mockJob, 'SequelizeError', null, mockLogContext);

      expect(result).toBe(0);
    });

    it('should include params in the logged request body if present', async () => {
      const requestWithParams = {
        ...mockRequest,
        params: { id: '123', action: 'update' },
      };

      const mockError = new Error('Params test error');

      await handleErrors(requestWithParams, mockResponse, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('TEST - id:'),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Params test error'),
      );
    });

    it('should use the error value directly if it does not have a stack', async () => {
      const mockError = 'This is a string error';

      await handleWorkerError(mockJob, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`UNEXPECTED ERROR - ${mockError}`),
      );
    });

    it('should handle null or undefined error gracefully', async () => {
      const mockError = null;

      await handleWorkerError(mockJob, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(
        `${mockLogContext.namespace} - UNEXPECTED ERROR - ${mockError}`,
      );
    });

    it('should handle error when it is an object', async () => {
      const mockError = { message: 'Object error', code: 500 };

      await handleErrors(mockRequest, mockResponse, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`UNEXPECTED ERROR - ${JSON.stringify(mockError)}`),
      );
    });

    it('should include query in the logged request body if present', async () => {
      const requestWithQuery = {
        ...mockRequest,
        query: { search: 'test', sort: 'asc' },
      };

      const mockError = new Error('Query test error');

      await handleErrors(requestWithQuery, mockResponse, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('TEST - id:'),
      );
    });

    it('should set responseBody to the error value when error is not an object', async () => {
      const mockError = 'String error';

      await handleErrors(mockRequest, mockResponse, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(mockError),
      );
    });
  });

  describe('logRequestError suppression', () => {
    beforeEach(() => {
      process.env.SUPPRESS_ERROR_LOGGING = 'true';
    });

    afterEach(() => {
      delete process.env.SUPPRESS_ERROR_LOGGING;
    });

    it('should suppress error logging and return 0', async () => {
      const mockError = new Error('Test error');
      const result = await logRequestError(mockRequest, 'TestOperation', mockError, mockLogContext);
      expect(result).toBe(0);
    });

    it('should not suppress logging for SequelizeError regardless of SUPPRESS_ERROR_LOGGING', async () => {
      const result = await logRequestError(mockRequest, 'SequelizeError', mockSequelizeError, mockLogContext);
      expect(result).not.toBe(0);
    });
  });

  describe('logRequestError failure handling', () => {
    beforeEach(() => {
      jest.spyOn(logger, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('logs an error and returns null on failure to store RequestError', async () => {
      jest.spyOn(RequestErrors, 'create').mockRejectedValue(new Error('Database error'));

      const result = await logRequestError(mockRequest, 'TestOperation', new Error('Test error'), mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('unable to store RequestError'));
      expect(result).toBeNull();
    });
  });

  describe('handleError development logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      jest.spyOn(logger, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
      jest.restoreAllMocks();
    });

    it('logs the error in development environment', async () => {
      const mockError = new Error('Development error');
      await handleErrors(mockRequest, mockResponse, mockError, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(mockError);
    });
  });

  describe('handleError Sequelize connection errors', () => {
    beforeEach(() => {
      jest.spyOn(logger, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('throws an unhandled exception for ConnectionAcquireTimeoutError', async () => {
      const mockConnAcquireTimeoutError = new Sequelize.Sequelize.ConnectionAcquireTimeoutError(
        'Connection acquire timeout error',
      );

      await expect(
        handleErrors(mockRequest, mockResponse, mockConnAcquireTimeoutError, mockLogContext),
      ).rejects.toThrow(
        'Unhandled ConnectionAcquireTimeoutError: Restarting server due to database connection acquisition timeout.',
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Critical: SequelizeConnectionAcquireTimeoutError encountered. Restarting server.'),
      );
    });
  });

  describe('handleWorkerError', () => {
    const mockErrorJob = { id: 123 };
    const mockErrorLogContext = { namespace: 'WORKER' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log and throw Sequelize.ConnectionAcquireTimeoutError', async () => {
      const error = new Sequelize.ConnectionAcquireTimeoutError('Connection timeout error');

      await expect(handleWorkerErrors(mockErrorJob, error, mockErrorLogContext)).rejects.toThrow(
        'Unhandled ConnectionAcquireTimeoutError: Restarting server due to database connection acquisition timeout.',
      );

      expect(logger.error).toHaveBeenCalledWith(
        `${mockErrorLogContext.namespace} - Critical error: Restarting server.`,
      );
    });

    it('should log the error in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');

      await handleWorkerError(mockJob, error, mockLogContext);

      expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('should not log the error directly in production mode', async () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error');

      await handleWorkerError(mockJob, error, mockLogContext);

      expect(logger.error).not.toHaveBeenCalledWith(error);
    });
  });
});
