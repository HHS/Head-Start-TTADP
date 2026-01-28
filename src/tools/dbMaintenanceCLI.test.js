import { auditLogger } from '../logger';
import { sequelize } from '../models';
import logOldRecordsCount from './dbMaintenanceCLI';

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

describe('logOldRecordsCount', () => {
  const originalExitCode = process.exitCode;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it('queries tables', async () => {
    sequelize.query.mockResolvedValue([[{ count: '5' }]]);

    await logOldRecordsCount();

    expect(sequelize.query).toHaveBeenCalled();
    expect(auditLogger.error).not.toHaveBeenCalled();
  });

  it('logs and sets exitCode when a query fails', async () => {
    sequelize.query.mockRejectedValue(new Error('exit error'));

    await logOldRecordsCount();

    expect(auditLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('exit error'),
    );
    expect(process.exitCode).toBe(1);
  });
});
