import transactionWrapper, { hasModifiedData, readOnlyTransactionWrapper } from './transactionWrapper';
import httpContext from 'express-http-context';
import { auditLogger } from '../logger';
import db from '../models';
import { captureSnapshot, hasModifiedData } from '../lib/programmaticTransaction';
import handleErrors from '../lib/apiErrorHandler';

jest.mock('../lib/apiErrorHandler', () => jest.fn((req, res, err, context) => context));
jest.mock('../lib/programmaticTransaction', {
  captureSnapshot: jest.fn(),
  hasModifiedData: jest.fn(),
});

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
    await expect(wrapper(req, res, next)).rejects.toThrow('Transaction was flagged as READONLY, but has modified data.');

    mockHasModifiedData.mockRestore();
  });

  it('should return false if no ZAL tables are present in hasModifiedData', async () => {
    const snapshot = [];
    const originalDb = { ...db }; // Backup original db object

    // Mock `db` to exclude ZAL tables
    Object.keys(db).forEach((key) => {
      if (key.startsWith('ZAL')) {
        db[key] = undefined;
      }
    });

    const result = await hasModifiedData(snapshot, 'test-transaction-id');
    expect(result).toBe(false);

    // Restore original db
    Object.assign(db, originalDb);
  });

  it('should throw an error if transaction ID is not found', async () => {
    jest.spyOn(httpContext, 'get').mockReturnValue(null);
    await expect(hasModifiedData([], null)).rejects.toThrow('Transaction ID not found');
  });

  it('should throw an error if a snapshot entry is not found for a ZAL table', async () => {
    const snapshot = [{ table_name: 'SomeOtherTable', max_id: 1 }];

    // Mock the `db` object to include the necessary structure for `ZALDDL`
    db.ZALMissing = { findOne: jest.fn() };

    await expect(hasModifiedData(snapshot, 'test-transaction-id')).rejects.toThrow('Snapshot entry not found for table');
  });
});
