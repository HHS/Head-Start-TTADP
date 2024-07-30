import Sequelize from 'sequelize';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import db, { RequestErrors } from '../models';
import handleErrors, {
  handleUnexpectedErrorInCatchBlock,
  logRequestError,
} from './apiErrorHandler';
import { auditLogger } from '../logger';

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

const mockSequelizeError = new Sequelize.Error('Not all ok here');

const mockLogContext = {
  namespace: 'TEST',
};

describe('apiErrorHandler', () => {
  beforeEach(async () => {
    await RequestErrors.destroy({ where: {} });
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
  });

  it('handles a generic error', async () => {
    const mockGenericError = new Error('Unknown error');
    await handleErrors(mockRequest, mockResponse, mockGenericError, mockLogContext);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).not.toBe(0);
  });

  it('can handle unexpected error in catch block', async () => {
    const mockUnexpectedErr = new Error('Unexpected error');
    handleUnexpectedErrorInCatchBlock(mockRequest, mockResponse, mockUnexpectedErr, mockLogContext);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).toBe(0);
  });

  it('logs connection pool information on connection errors', async () => {
    const mockConnectionError = new Sequelize.ConnectionError(new Error('Connection error'));
    await handleErrors(mockRequest, mockResponse, mockConnectionError, mockLogContext);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Connection Pool: Used Connections'));

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).not.toBe(0);
    expect(requestErrors[0].operation).toBe('SequelizeError');
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
    const mockConnectionAcquireTimeoutError = new Sequelize
      .ConnectionAcquireTimeoutError(new Error('Connection acquire timeout error'));
    await handleErrors(
      mockRequest,
      mockResponse,
      mockConnectionAcquireTimeoutError,
      mockLogContext,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Connection Pool: Used Connections'));

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).not.toBe(0);
    expect(requestErrors[0].operation).toBe('SequelizeError');
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
    jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs an error and returns null on failure to store RequestError', async () => {
    // Simulate a failure by mocking createRequestError to throw an error
    jest.spyOn(RequestErrors, 'create').mockRejectedValue(new Error('Database error'));

    const result = await logRequestError(mockRequest, 'TestOperation', new Error('Test error'), mockLogContext);

    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('unable to store RequestError'));
    expect(result).toBeNull();
  });
});

describe('handleError development logging', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    jest.restoreAllMocks();
  });

  it('logs the error in development environment', async () => {
    const mockError = new Error('Development error');
    await handleErrors(mockRequest, mockResponse, mockError, mockLogContext);

    expect(auditLogger.error).toHaveBeenCalledWith(mockError);
  });
});

describe('handleError Sequelize connection errors', () => {
  beforeEach(() => {
    jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs connection pool info on Sequelize.ConnectionError', async () => {
    const mockConnectionError = new Sequelize.ConnectionError('Connection error');
    await handleErrors(mockRequest, mockResponse, mockConnectionError, mockLogContext);

    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Connection Pool'));
  });

  it('logs connection pool info on Sequelize.ConnectionAcquireTimeoutError', async () => {
    const mockConnectionAcquireTimeoutError = new Sequelize.ConnectionAcquireTimeoutError('Connection acquire timeout error');
    await handleErrors(
      mockRequest,
      mockResponse,
      mockConnectionAcquireTimeoutError,
      mockLogContext,
    );

    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Connection Pool'));
  });
});
