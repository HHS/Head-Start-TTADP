import { auditLogger } from '../logger';
import { sequelize } from '../models';
import verifyProcessedData from './verifyProcessedData';

jest.mock('../logger', () => ({ auditLogger: { info: jest.fn(), error: jest.fn() } }));
jest.mock('../models', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('./processData', () => ({
  hsesUsers: [{ email: 'Test.User@example.test' }],
  KEPT_AUDIT_TABLES: ['ZALDDL'],
}));

// Sequelize's Postgres dialect returns rows of this query as arrays of values, whatever the type
const SEQUELIZE_TABLE_NAME_SQL = 'SELECT table_name FROM information_schema.tables';

// Answer each query by what it selects, in the order verifyProcessedData asks
const mockQueries = ({ unanonymizedUsers = 0, auditTables = {}, requestErrors = 0 }) => {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM "Users"')) return [{ count: unanonymizedUsers }];
    if (sql.includes('information_schema.tables')) {
      const names = Object.keys(auditTables);
      if (sql.trim().startsWith(SEQUELIZE_TABLE_NAME_SQL)) return names.map((name) => [name]);
      return names.map((name) => ({ tableName: name }));
    }
    const existsMatch = sql.match(/FROM "(ZAL\w+)"/);
    if (existsMatch) return [{ hasRows: auditTables[existsMatch[1]] }];
    if (sql.includes('FROM "RequestErrors"')) return [{ count: requestErrors }];
    throw new Error(`unexpected query: ${sql}`);
  });
};

describe('verifyProcessedData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero counts and logs them when the data is processed', async () => {
    mockQueries({ auditTables: { ZALGoals: false, ZALUsers: false } });

    const counts = await verifyProcessedData();

    expect(counts).toEqual({ unanonymizedUsers: 0, nonEmptyAuditTables: 0, requestErrors: 0 });
    expect(auditLogger.info).toHaveBeenCalledWith(
      'verifyProcessedData counts: {"unanonymizedUsers":0,"nonEmptyAuditTables":0,"requestErrors":0}'
    );
  });

  it('passes the lowercased HSES emails and kept audit tables as replacements', async () => {
    mockQueries({});

    await verifyProcessedData();

    const usersCall = sequelize.query.mock.calls.find(([sql]) => sql.includes('FROM "Users"'));
    expect(usersCall[1].replacements).toEqual({ hsesEmails: ['test.user@example.test'] });
    const tablesCall = sequelize.query.mock.calls.find(([sql]) =>
      sql.includes('information_schema.tables')
    );
    expect(tablesCall[1].replacements).toEqual({ keptAuditTables: ['ZALDDL'] });
  });

  it('throws with counts only when users were not anonymized', async () => {
    mockQueries({ unanonymizedUsers: 3 });

    await expect(verifyProcessedData()).rejects.toMatchObject({
      name: 'ProcessedDataVerificationError',
      message:
        'Processed data verification failed: {"unanonymizedUsers":3,"nonEmptyAuditTables":0,"requestErrors":0}',
    });
  });

  it('throws when audit tables or request errors still hold rows', async () => {
    mockQueries({ auditTables: { ZALGoals: true, ZALUsers: false }, requestErrors: 2 });

    await expect(verifyProcessedData()).rejects.toMatchObject({
      name: 'ProcessedDataVerificationError',
      message:
        'Processed data verification failed: {"unanonymizedUsers":0,"nonEmptyAuditTables":1,"requestErrors":2}',
    });
  });
});
