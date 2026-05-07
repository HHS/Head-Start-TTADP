import { auditLogger } from '../logger';
import { sequelize } from '../models';
import deleteOldRecords from './dbMaintenance';

jest.mock('../logger', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    close: jest.fn(),
  },
}));

describe('deleteOldRecords', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('discovers tables, deletes old records, and logs deleted and total counts for each', async () => {
    sequelize.query
      // First call: table discovery from information_schema
      .mockResolvedValueOnce([[{ table_name: 'ZALActivityReports' }, { table_name: 'ZALGoals' }]])
      // Second call: delete count for ZALActivityReports
      .mockResolvedValueOnce([[{ count: '12' }]])
      // Third call: delete count for ZALGoals
      .mockResolvedValueOnce([[{ count: '0' }]])
      // Fourth call: total count for ZALActivityReports
      .mockResolvedValueOnce([[{ count: '88' }]])
      // Fifth call: total count for ZALGoals
      .mockResolvedValueOnce([[{ count: '42' }]]);

    await deleteOldRecords();

    expect(sequelize.query).toHaveBeenCalledTimes(5);
    // Verify table discovery query targets ZAL tables
    expect(sequelize.query).toHaveBeenNthCalledWith(1, expect.stringContaining("LIKE 'ZAL%'"));
    // Verify per-table delete queries reference correct table names
    expect(sequelize.query).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE FROM'));
    expect(sequelize.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"ZALActivityReports"')
    );
    expect(sequelize.query).toHaveBeenNthCalledWith(3, expect.stringContaining('DELETE FROM'));
    expect(sequelize.query).toHaveBeenNthCalledWith(3, expect.stringContaining('"ZALGoals"'));
    expect(sequelize.query).toHaveBeenNthCalledWith(4, expect.stringContaining('SELECT COUNT(*)'));
    expect(sequelize.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('"ZALActivityReports"')
    );
    expect(sequelize.query).toHaveBeenNthCalledWith(5, expect.stringContaining('SELECT COUNT(*)'));
    expect(sequelize.query).toHaveBeenNthCalledWith(5, expect.stringContaining('"ZALGoals"'));
    expect(auditLogger.info).toHaveBeenCalledWith(
      'Table: ZALActivityReports, Total records: 88, Deleted records older than 3 years: 12'
    );
    expect(auditLogger.info).toHaveBeenCalledWith(
      'Table: ZALGoals, Total records: 42, Deleted records older than 3 years: 0'
    );
    expect(auditLogger.info).toHaveBeenCalledWith('Total deleted records older than 3 years: 12');
    expect(auditLogger.error).not.toHaveBeenCalled();
  });

  it('handles empty table discovery result', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);

    await deleteOldRecords();

    // Only the discovery query should run
    expect(sequelize.query).toHaveBeenCalledTimes(1);
    expect(auditLogger.error).not.toHaveBeenCalled();
  });

  it('logs errors for individual table failures without blocking others', async () => {
    sequelize.query
      .mockResolvedValueOnce([
        [
          { table_name: 'ZALActivityReports' },
          { table_name: 'ZALBadTable' },
          { table_name: 'ZALGoals' },
        ],
      ])
      .mockResolvedValueOnce([[{ count: '3' }]])
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce([[{ count: '7' }]])
      .mockResolvedValueOnce([[{ count: '9' }]])
      .mockResolvedValueOnce([[{ count: '11' }]]);

    await deleteOldRecords();

    expect(sequelize.query).toHaveBeenCalledTimes(6);
    // Successful tables are logged
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALActivityReports'));
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALGoals'));
    // Failed table is logged as error with table name
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('ZALBadTable'));
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
    expect(process.exitCode).toBe(1);
  });

  it('sets exitCode when the discovery query fails', async () => {
    sequelize.query.mockRejectedValueOnce(new Error('connection refused'));

    await deleteOldRecords();

    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
    expect(process.exitCode).toBe(1);
  });
});
