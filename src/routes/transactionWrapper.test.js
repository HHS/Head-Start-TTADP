import httpContext from 'express-http-context';
import transactionWrapper, { readOnlyTransactionWrapper, calculateStats } from './transactionWrapper';
import { auditLogger } from '../logger';
import db from '../models';
import { captureSnapshot, hasModifiedData } from '../lib/programmaticTransaction';
import handleErrors from '../lib/apiErrorHandler';

let newrelicMock;

jest.mock('../lib/apiErrorHandler', () => jest.fn((req, res, err, context) => context));
jest.mock('../lib/programmaticTransaction', () => ({
  captureSnapshot: jest.fn(),
  hasModifiedData: jest.fn(),
}));

describe('transactionWrapper', () => {
  let originalFunction = jest.fn().mockResolvedValue('result');
  let wrapper;

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => db.sequelize.close());

  it('should call the original function', async () => {
    originalFunction = jest.fn();
    wrapper = transactionWrapper(originalFunction);
    await wrapper();
    expect(originalFunction).toHaveBeenCalled();
  });

  it('should log the execution time of the original function', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction);
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('Request for mockConstructor took'));
  });

  it('should accept and log the context, if specified', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction, 'testContext');
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(
      expect.stringContaining('Request for mockConstructor took'),
    );
  });

  it('should handle errors in the original function', async () => {
    originalFunction = jest.fn().mockRejectedValue(new Error('Test Error'));
    wrapper = transactionWrapper(originalFunction);

    const req = {};
    const res = {
      status: () => jest.fn().mockReturnValue({ end: () => jest.fn() }),
    };
    const next = jest.fn();

    await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(req, res, new Error('Test Error'), { namespace: 'SERVICE:WRAPPER' });
  });

  it('should call hasModifiedData and throw error if data is modified in readOnlyTransactionWrapper', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = readOnlyTransactionWrapper(originalFunction);

    const mockHasModifiedData = hasModifiedData.mockResolvedValue(true);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(
      req,
      res,
      new Error('Transaction was flagged as READONLY, but has modified data.'),
      { namespace: 'SERVICE:WRAPPER' },
    );

    mockHasModifiedData.mockRestore();
  });
});

describe('logRequestDuration', () => {
  let logRequestDuration;

  beforeEach(() => {
    jest.resetModules();
    newrelicMock = { noticeError: jest.fn() };
    jest.mock('newrelic', () => newrelicMock);
    // eslint-disable-next-line global-require
    ({ logRequestDuration } = require('./transactionWrapper'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log durations and not alert if below thresholds', () => {
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');
    logRequestDuration('testFunction', 150, 'success');
    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('testFunction'));
    expect(newrelicMock.noticeError).not.toHaveBeenCalled();
  });

  it('should alert if duration exceeds max threshold in production', () => {
    process.env.NODE_ENV = 'production';
    logRequestDuration('testFunction', 15000, 'success');
    expect(newrelicMock.noticeError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ duration: 15000, functionName: 'testFunction' }),
    );
    process.env.NODE_ENV = 'test';
  });

  it('should not alert if duration exceeds max threshold outside production', () => {
    process.env.NODE_ENV = 'test';
    logRequestDuration('testFunction', 15000, 'success');
    expect(newrelicMock.noticeError).not.toHaveBeenCalled();
  });

  it('should not alert if duration is below the minimum threshold', () => {
    logRequestDuration('testFunction', 50, 'success');
    expect(newrelicMock.noticeError).not.toHaveBeenCalled();
  });

  it('should alert if duration exceeds mean + delta after enough requests in production', () => {
    process.env.NODE_ENV = 'production';
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 25; i++) {
      logRequestDuration('testFunction', 200, 'success');
    }
    logRequestDuration('testFunction', 500, 'success');
    expect(newrelicMock.noticeError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ duration: 500, functionName: 'testFunction' }),
    );
    process.env.NODE_ENV = 'test';
  });
});

describe('calculateStats', () => {
  it('should calculate mean and stddev correctly', () => {
    const durations = [100, 200, 300, 400, 500];
    const { mean, stddev } = calculateStats(durations);
    expect(mean).toBe(300);
    expect(stddev).toBeCloseTo(141.42, 2);
  });

  it('should handle empty durations array gracefully', () => {
    const durations = [];
    const { mean, stddev } = calculateStats(durations);
    expect(mean).toBeNaN();
    expect(stddev).toBeNaN();
  });
});
