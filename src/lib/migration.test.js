const { prepMigration, setAuditLoggingState, removeTables } = require('./migration');

describe('prepMigration', () => {
  const queryInterface = {
    sequelize: {
      query: jest.fn(),
    },
  };
  const transaction = {};
  const sessionSig = 'unique-session-id';
  const auditDescriptor = 'TEST AUDIT DESCRIPTOR';
  const loggedUser = '123';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call sequelize.query with correct SQL and parameters', async () => {
    await prepMigration(queryInterface, transaction, sessionSig, auditDescriptor, loggedUser);

    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      `SELECT
      set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
      { transaction },
    );
  });

  it('should call sequelize.query with default auditDescriptor and loggedUser values', async () => {
    await prepMigration(queryInterface, transaction, sessionSig);

    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      `SELECT
      set_config('audit.loggedUser', '0', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', 'RUN MIGRATIONS', TRUE) as "auditDescriptor";`,
      { transaction },
    );
  });
});

describe('setAuditLoggingState', () => {
  const queryInterface = {
    sequelize: {
      query: jest.fn(),
    },
  };
  const transaction = {};
  const enable = true;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call sequelize.query with correct SQL and parameters', async () => {
    await setAuditLoggingState(queryInterface, transaction, enable);

    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      `SELECT "ZAFSetTriggerState"(null, null, null, '${enable ? 'ENABLE' : 'DISABLE'}');`,
      { transaction },
    );
  });

  it('should call sequelize.query with default enable value', async () => {
    await setAuditLoggingState(queryInterface, transaction);

    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
    // eslint-disable-next-line @typescript-eslint/quotes
      `SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');`,
      { transaction },
    );
  });
});

describe('removeTables', () => {
  let queryInterface;
  let transaction;

  beforeEach(() => {
    queryInterface = {
      sequelize: {
        query: jest.fn(),
      },
      dropTable: jest.fn(),
      createTable: jest.fn(),
      truncate: jest.fn(),
    };
    transaction = {};
  });

  it('should remove tables and their audit logs', async () => {
    // Mock database calls
    queryInterface.sequelize.query.mockResolvedValueOnce();
    queryInterface.dropTable.mockResolvedValueOnce();
    queryInterface.truncate.mockResolvedValueOnce();

    // Call removeTables function to remove test tables
    await removeTables(queryInterface, transaction, ['test_table_1', 'test_table_2']);

    // Check that tables were removed
    expect(queryInterface.createTable).toHaveBeenCalledTimes(0);
    expect(queryInterface.dropTable).toHaveBeenCalledTimes(4);

    const tableNames = ['test_table_1', 'ZALtest_table_1', 'test_table_2', 'ZALtest_table_2'];
    expect(queryInterface.dropTable).toHaveBeenCalledTimes(4);
    expect(queryInterface.dropTable).toHaveBeenCalledWith(expect.any(String), { transaction });
    expect.arrayContaining(tableNames.forEach((tableName) => {
      expect(queryInterface.dropTable).toHaveBeenCalledWith(tableName, { transaction });
    }));

    // Check that audit log tables were removed
    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(4);
    expect(queryInterface.sequelize.query)
      .toHaveBeenCalledWith(expect.any(String), { transaction });
  });

  it('should handle empty array of tables', async () => {
    // Call removeTables function with empty array of tables
    await removeTables(queryInterface, transaction, []);

    // Check that no tables were removed
    expect(queryInterface.createTable).toHaveBeenCalledTimes(0);
    expect(queryInterface.dropTable).toHaveBeenCalledTimes(0);

    // Check that no audit log tables were removed
    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(0);

    // Check that no tables were truncated
    expect(queryInterface.truncate).toHaveBeenCalledTimes(0);
  });
});
