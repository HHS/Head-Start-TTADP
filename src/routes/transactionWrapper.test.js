import { Transaction } from 'sequelize';
import handleErrors from '../lib/apiErrorHandler';
import { hasModifiedData } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';
import db from '../models';
import transactionWrapper, { readOnlyTransactionWrapper } from './transactionWrapper';

jest.mock('../lib/apiErrorHandler', () => jest.fn((_req, _res, _err, context) => context));
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
