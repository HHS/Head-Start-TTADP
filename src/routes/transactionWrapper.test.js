import { Transaction } from 'sequelize';
import handleErrors from '../lib/apiErrorHandler';
import { hasModifiedData } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';
import db from '../models';
import { removeFromAuditedTransactions } from '../models/auditModelGenerator';
import transactionWrapper, { readOnlyTransactionWrapper } from './transactionWrapper';

jest.mock('../lib/apiErrorHandler', () =>
  jest.fn((req, _res, err, context) => {
    if (req?.inTransactionWrapper) {
      throw err;
    }
    return context;
  })
);
jest.mock('../lib/programmaticTransaction', () => ({
  captureSnapshot: jest.fn(),
  hasModifiedData: jest.fn(),
}));
jest.mock('../models/auditModelGenerator', () => {
  const actual = jest.requireActual('../models/auditModelGenerator');

  return {
    ...actual,
    addAuditTransactionSettings: jest.fn(),
    removeFromAuditedTransactions: jest.fn(),
  };
});

describe('transactionWrapper', () => {
  let originalFunction = jest.fn().mockResolvedValue('result');
  let wrapper;

  beforeEach(() => {
    jest
      .spyOn(db.sequelize, 'transaction')
      .mockImplementation(async (_options, callback) => callback({ id: 'transaction-id' }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  afterAll(() => db.sequelize.close());
  it('should call the original function', async () => {
    originalFunction = jest.fn();
    wrapper = transactionWrapper(originalFunction);
    await wrapper();
    expect(originalFunction).toHaveBeenCalled();
  });

  it('marks the request as running inside transactionWrapper during handler execution', async () => {
    let inTransactionWrapper;
    originalFunction = jest.fn().mockImplementation((req) => {
      inTransactionWrapper = req.inTransactionWrapper;
      return 'result';
    });
    wrapper = transactionWrapper(originalFunction);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapper(req, res, next);

    expect(inTransactionWrapper).toBe(true);
    expect(req.inTransactionWrapper).toBeUndefined();
    expect(originalFunction).toHaveBeenCalledWith(req, res, next);
  });

  it('should log the execution time of the original function', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction);
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('execution time'));
  });

  it('should accept and log the context, if specified', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction, 'testContext');
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('testContext'));
  });

  it('should handle errors in the original function', async () => {
    const error = new Error('Test Error');
    originalFunction = jest.fn().mockRejectedValue(error);
    wrapper = transactionWrapper(originalFunction);

    // Correctly mock `handleErrors` as a function
    const req = {};
    const res = {
      status: () => jest.fn().mockReturnValue({ end: () => jest.fn() }),
    };
    const next = jest.fn();

    await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
      namespace: 'SERVICE:WRAPPER',
    });
    expect(removeFromAuditedTransactions).toHaveBeenCalled();
    expect(req.inTransactionWrapper).toBeUndefined();
  });

  it('rejects the transaction callback when a wrapped handler catches and delegates to handleErrors', async () => {
    const error = new Error('Test Error');
    let transactionCallbackRejected = false;
    db.sequelize.transaction.mockImplementationOnce(async (_options, callback) => {
      try {
        return await callback({ id: 'transaction-id' });
      } catch (err) {
        transactionCallbackRejected = true;
        throw err;
      }
    });
    originalFunction = jest.fn(async (req, res) => {
      try {
        req.writeHappened = true;
        throw error;
      } catch (err) {
        return handleErrors(req, res, err, { namespace: 'INNER_HANDLER' });
      }
    });
    wrapper = transactionWrapper(originalFunction);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapper(req, res, next);

    expect(transactionCallbackRejected).toBe(true);
    expect(handleErrors).toHaveBeenNthCalledWith(1, req, res, error, {
      namespace: 'INNER_HANDLER',
    });
    expect(handleErrors).toHaveBeenNthCalledWith(2, req, res, error, {
      namespace: 'SERVICE:WRAPPER',
    });
    expect(removeFromAuditedTransactions).toHaveBeenCalled();
    expect(req.inTransactionWrapper).toBeUndefined();
  });

  it('should call hasModifiedData and throw error if data is modified in readOnlyTransactionWrapper', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = readOnlyTransactionWrapper(originalFunction);

    const mockHasModifiedData = hasModifiedData.mockResolvedValue(true);
    const req = {};
    const res = {};
    const next = jest.fn();

    // Expect an error because hasModifiedData is mocked to return true (indicating modified data)
    await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(
      req,
      res,
      expect.objectContaining({
        message: 'Transaction was flagged as READONLY, but has modifed data.',
      }),
      { namespace: 'SERVICE:WRAPPER' }
    );

    mockHasModifiedData.mockRestore();
  });

  it('should pass transaction options through to sequelize.transaction', async () => {
    originalFunction = jest.fn().mockResolvedValue('result');
    wrapper = transactionWrapper(originalFunction, '', false, {
      isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    });

    await wrapper();

    expect(db.sequelize.transaction).toHaveBeenCalledWith(
      { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
      expect.any(Function)
    );
  });
});
