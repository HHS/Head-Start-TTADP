import httpContext from 'express-http-context';
import transactionWrapper, { readOnlyTransactionWrapper } from './transactionWrapper';
import { auditLogger } from '../logger';
import db from '../models';
import { captureSnapshot, hasModifiedData } from '../lib/programmaticTransaction';
import handleErrors from '../lib/apiErrorHandler';

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
    originalFunction = jest.fn().mockRejectedValue(new Error('Test Error'));
    wrapper = transactionWrapper(originalFunction);

    // Correctly mock `handleErrors` as a function
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

    // Expect an error because hasModifiedData is mocked to return true (indicating modified data)
    const responce = await wrapper(req, res, next);
    expect(handleErrors).toHaveBeenCalledWith(
      req,
      res,
      new Error('Transaction was flagged as READONLY, but has modifed data.'),
      { namespace: 'SERVICE:WRAPPER' },
    );

    mockHasModifiedData.mockRestore();
  });
});
