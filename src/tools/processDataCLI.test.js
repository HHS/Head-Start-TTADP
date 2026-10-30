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

  it('logs only the error name and code, with a fixed message', () => {
    const error = new Error('syntax error at or near "Keefe"');
    error.name = 'SequelizeDatabaseError';
    error.sql = "SELECT 'secret-sql-data'";
    error.parent = { code: '42601', sql: "SELECT 'secret-sql-data'" };

    logProcessDataError(error);

    expect(auditLogger.error).toHaveBeenCalledTimes(1);
    expect(auditLogger.error).toHaveBeenCalledWith(
      'processData failed: SequelizeDatabaseError (code 42601)'
    );
  });

  it('does not log sensitive input echoed in the error message', () => {
    const error = new Error('invalid input syntax for type integer: "private.person@example.test"');
    error.name = 'SequelizeDatabaseError';
    error.parent = {
      code: '22P02',
      message: 'invalid input syntax for type integer: "private.person@example.test"',
    };

    logProcessDataError(error);

    const [message] = auditLogger.error.mock.calls[0];
    expect(message).toBe('processData failed: SequelizeDatabaseError (code 22P02)');
    expect(message).not.toContain('private.person');
    expect(message).not.toContain('invalid input syntax');
  });

  it('falls back to a generic name and omits an unsafe name or code', () => {
    const error = new Error('boom');
    error.name = 'Bad Name: someone@example.test';
    error.code = 'not a code: secret value';

    logProcessDataError(error);

    expect(auditLogger.error).toHaveBeenCalledWith('processData failed: Error');
  });

  it('handles non-Error values', () => {
    logProcessDataError('boom with secret');

    expect(auditLogger.error).toHaveBeenCalledWith('processData failed: Error');
  });
});
