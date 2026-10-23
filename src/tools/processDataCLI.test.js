import { auditLogger } from '../logger';
import processData from './processData';
import { logProcessDataError } from './processDataCLI';

jest.mock('../logger', () => ({ auditLogger: { error: jest.fn() } }));
jest.mock('./processData', () => ({
  __esModule: true,
  default: jest.fn(() => new Promise(() => {})),
}));

// processData runs when the CLI module is imported, before any test body
const processDataCalls = processData.mock.calls.length;

describe('processDataCLI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs processData on import', () => {
    expect(processDataCalls).toBe(1);
  });

  it('logs only the name, message and code of a database error', () => {
    const error = new Error('syntax error at or near "Keefe"');
    error.name = 'SequelizeDatabaseError';
    error.sql = "SELECT 'secret-sql-data'";
    error.parent = { code: '42601', sql: "SELECT 'secret-sql-data'" };

    logProcessDataError(error);

    expect(auditLogger.error).toHaveBeenCalledTimes(1);
    const [message] = auditLogger.error.mock.calls[0];
    expect(message).toBe(
      'processData failed: SequelizeDatabaseError: syntax error at or near "Keefe" (code 42601)'
    );
    expect(message).not.toContain('secret-sql-data');
  });

  it('handles errors without a code or name', () => {
    logProcessDataError('boom');

    expect(auditLogger.error).toHaveBeenCalledWith('processData failed: Error: boom');
  });
});
