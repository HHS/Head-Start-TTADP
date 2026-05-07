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
    getQueryInterface: jest.fn(() => ({
      quoteIdentifier: jest.fn((identifier) => `"${identifier.replace(/"/g, '""')}"`),
    })),
  },
}));

describe('deleteOldRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discovers tables, deletes old records, and logs deleted and total counts for each', async () => {
    sequelize.query
      // First call: table discovery from information_schema
      .mockResolvedValueOnce([[{ table_name: 'ZALActivityReports' }, { table_name: 'ZALGoals' }]])
      // Second call: delete count for ZALActivityReports
      .mockResolvedValueOnce([[{ count: '12' }]])
      // Third call: total count for ZALActivityReports
      .mockResolvedValueOnce([[{ count: '88' }]])
      // Fourth call: delete count for ZALGoals
      .mockResolvedValueOnce([[{ count: '0' }]])
      // Fifth call: total count for ZALGoals
      .mockResolvedValueOnce([[{ count: '42' }]]);

    const result = await deleteOldRecords();

    expect(sequelize.query).toHaveBeenCalledTimes(5);
    // Verify table discovery query targets ZAL tables
    expect(sequelize.query).toHaveBeenNthCalledWith(1, expect.stringContaining("LIKE 'ZAL%'"));
    // Verify per-table delete queries reference correct table names
    expect(sequelize.query).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE FROM'));
    expect(sequelize.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"ZALActivityReports"')
    );
    expect(sequelize.query).toHaveBeenNthCalledWith(3, expect.stringContaining('SELECT COUNT(*)'));
    expect(sequelize.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('"ZALActivityReports"')
    );
    expect(sequelize.query).toHaveBeenNthCalledWith(4, expect.stringContaining('DELETE FROM'));
    expect(sequelize.query).toHaveBeenNthCalledWith(4, expect.stringContaining('"ZALGoals"'));
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
    expect(result).toEqual({
      totalDeletedRecords: 12,
      tablesProcessed: 2,
    });
  });

  it('handles empty table discovery result', async () => {
    sequelize.query.mockResolvedValueOnce([[]]);

    const result = await deleteOldRecords();

    // Only the discovery query should run
    expect(sequelize.query).toHaveBeenCalledTimes(1);
    expect(auditLogger.error).not.toHaveBeenCalled();
    expect(result).toEqual({
      totalDeletedRecords: 0,
      tablesProcessed: 0,
    });
  });

  it('quotes discovered table names before interpolating them into maintenance queries', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ table_name: 'ZALBad"Table' }]])
      .mockResolvedValueOnce([[{ count: '1' }]])
      .mockResolvedValueOnce([[{ count: '2' }]]);

    await deleteOldRecords();

    expect(sequelize.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM "ZALBad""Table"')
    );
    expect(sequelize.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM "ZALBad""Table"')
    );
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
      .mockResolvedValueOnce([[{ count: '7' }]])
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce([[{ count: '9' }]])
      .mockResolvedValueOnce([[{ count: '11' }]]);

    await expect(deleteOldRecords()).rejects.toThrow(
      'Failed to clean up 1 audit log tables: ZALBadTable: permission denied'
    );

    expect(sequelize.query).toHaveBeenCalledTimes(6);
    // Successful tables are logged
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALActivityReports'));
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALGoals'));
    // Failed table is logged as error with table name
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('ZALBadTable'));
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
  });

  it('throws when the discovery query fails', async () => {
    sequelize.query.mockRejectedValueOnce(new Error('connection refused'));

    await expect(deleteOldRecords()).rejects.toThrow('connection refused');

    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });
});
