const {
  prepMigration,
  setAuditLoggingState,
  removeTables,
  replaceValueInArray,
  replaceValueInJSONBArray,
  updateUsersFlagsEnum,
  dropAndRecreateEnum,
} = require('./migration');

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

describe('replaceValueInArray', () => {
  let queryInterface;
  const table = 'test_table';
  const column = 'test_column';
  const oldValue = 'old_value';
  const newValue = 'new_value';

  beforeEach(() => {
    queryInterface = {
      sequelize: {
        query: jest.fn(),
      },
    };
  });

  it('should call the update query with the correct SQL', async () => {
    await replaceValueInArray(queryInterface, null, table, column, oldValue, newValue);

    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(/* sql */`
  UPDATE "${table}"
  SET "${column}" = array_replace("${column}", '${oldValue}', '${newValue}')
  WHERE "${column}" @> ARRAY['${oldValue}']::VARCHAR[];
`, { transaction: null });
  });
});

describe('replaceValueInJSONBArray', () => {
  let queryInterface;
  const table = 'test_table';
  const column = 'test_column';
  const field = 'test_field';
  const oldValue = 'old_value';
  const newValue = 'new_value';

  beforeEach(() => {
    queryInterface = {
      sequelize: {
        query: jest.fn(),
      },
    };
  });

  it('should call the update query with the correct SQL', async () => {
    await replaceValueInJSONBArray(queryInterface, null, table, column, field, oldValue, newValue);

    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(/* sql */`
  UPDATE "${table}"
  SET
    "${column}" = (
      SELECT
        JSONB_SET(
          "${column}",
          '{${field}}',
          (
            SELECT
              jsonb_agg(
                CASE
                  WHEN value::text = '"${oldValue}"'
                    THEN '"${newValue}"'::jsonb
                  ELSE value
                END
              )
            FROM jsonb_array_elements("${column}" -> '${field}') AS value
          )::jsonb
        )
    )
  WHERE "${column}" -> '${field}' @> '["${oldValue}"]'::jsonb;
`, { transaction: null });
  });
});

describe('updateUsersFlagsEnum', () => {
  let queryInterface;
  const transaction = {};

  beforeEach(() => {
    queryInterface = {
      sequelize: {
        query: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should update flags and recreate enum if valuesToRemove is provided', async () => {
    const valuesToRemove = ['value1', 'value2'];
    await updateUsersFlagsEnum(queryInterface, transaction, valuesToRemove);

    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(12);
  });
});

describe('dropAndRecreateEnum', () => {
  const transaction = {};
  let queryInterface;
  const enumName = 'MyEnum';
  const tableName = 'MyTable';
  const columnName = 'MyColumn';
  const enumValues = ['Value1', 'Value2'];
  const enumType = 'text';

  beforeEach(() => {
    queryInterface = {
      sequelize: {
        query: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should rename the existing type, create a new type, add values to the new type, update the columns to use the new type, and remove the old type', async () => {
    await dropAndRecreateEnum(
      queryInterface,
      transaction,
      enumName,
      tableName,
      columnName,
      enumValues,
      enumType,
    );

    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(4);
  });

  it('should use default values for enumValues and enumType if not provided', async () => {
    await dropAndRecreateEnum(queryInterface, transaction, enumName, tableName, columnName);

    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(2);
  });
});
