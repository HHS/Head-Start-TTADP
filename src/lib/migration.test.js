const {
  prepMigration,
  setAuditLoggingState,
  removeTables,
  replaceValueInArray,
  replaceValueInJSONBArray,
  updateUsersFlagsEnum,
  dropAndRecreateEnum,
  updateSequence,
  addValuesToEnumIfTheyDontExist,
} = require('./migration')

describe('migration', () => {
  const queryInterface = {
    sequelize: {
      query: jest.fn(),
    },
    createTable: jest.fn(),
    dropTable: jest.fn(),
    truncate: jest.fn(),
  }
  const transaction = {}
  describe('prepMigration', () => {
    const sessionSig = 'unique-session-id'
    const auditDescriptor = 'TEST AUDIT DESCRIPTOR'
    const loggedUser = '123'

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should call sequelize.query with correct SQL and parameters', async () => {
      await prepMigration(queryInterface, transaction, sessionSig, auditDescriptor, loggedUser)

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        /* sql */ `SELECT
      set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )
    })

    it('should call sequelize.query with default auditDescriptor and loggedUser values', async () => {
      await prepMigration(queryInterface, transaction, sessionSig)

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        /* sql */ `SELECT
      set_config('audit.loggedUser', '0', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', 'RUN MIGRATIONS', TRUE) as "auditDescriptor";`,
        { transaction }
      )
    })
  })

  describe('setAuditLoggingState', () => {
    const enable = true

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should call sequelize.query with correct SQL and parameters', async () => {
      await setAuditLoggingState(queryInterface, transaction, enable)

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        `SELECT "ZAFSetTriggerState"(null, null, null, '${enable ? 'ENABLE' : 'DISABLE'}');`,
        { transaction }
      )
    })

    it('should call sequelize.query with default enable value', async () => {
      await setAuditLoggingState(queryInterface, transaction)

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/quotes
        `SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');`,
        { transaction }
      )
    })
  })

  describe('removeTables', () => {
    afterEach(() => {
      jest.clearAllMocks()
      jest.resetModules()
    })
    it('should remove tables and their audit logs', async () => {
      // Mock database calls
      queryInterface.sequelize.query.mockResolvedValueOnce()
      queryInterface.dropTable.mockResolvedValueOnce()
      queryInterface.truncate.mockResolvedValueOnce()

      // Call removeTables function to remove test tables
      await removeTables(queryInterface, transaction, ['test_table_1', 'test_table_2'])

      // Check that tables were removed
      expect(queryInterface.createTable).toHaveBeenCalledTimes(0)
      expect(queryInterface.dropTable).toHaveBeenCalledTimes(4)

      const tableNames = ['test_table_1', 'ZALtest_table_1', 'test_table_2', 'ZALtest_table_2']
      expect(queryInterface.dropTable).toHaveBeenCalledTimes(4)
      expect(queryInterface.dropTable).toHaveBeenCalledWith(expect.any(String), { transaction })
      expect.arrayContaining(
        tableNames.forEach((tableName) => {
          expect(queryInterface.dropTable).toHaveBeenCalledWith(tableName, { transaction })
        })
      )

      // Check that audit log tables were removed
      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(4)
      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(expect.any(String), {
        transaction,
      })
    })

    it('should handle empty array of tables', async () => {
      // Call removeTables function with empty array of tables
      await removeTables(queryInterface, transaction, [])

      // Check that no tables were removed
      expect(queryInterface.createTable).toHaveBeenCalledTimes(0)
      expect(queryInterface.dropTable).toHaveBeenCalledTimes(0)

      // Check that no audit log tables were removed
      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(0)

      // Check that no tables were truncated
      expect(queryInterface.truncate).toHaveBeenCalledTimes(0)
    })
  })

  describe('replaceValueInArray', () => {
    const table = 'test_table'
    const column = 'test_column'
    const oldValue = 'old_value'
    const newValue = 'new_value'

    it('should call the update query with the correct SQL', async () => {
      await replaceValueInArray(queryInterface, null, table, column, oldValue, newValue)

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        /* sql */ `
  UPDATE "${table}"
  SET "${column}" = array_replace("${column}", '${oldValue}', '${newValue}')
  WHERE "${column}" @> ARRAY['${oldValue}']::VARCHAR[];
`,
        { transaction: null }
      )
    })
  })

  describe('replaceValueInJSONBArray', () => {
    const table = 'test_table'
    const column = 'test_column'
    const field = 'test_field'
    const oldValue = 'old_value'
    const newValue = 'new_value'

    it('should call the update query with the correct SQL', async () => {
      await replaceValueInJSONBArray(queryInterface, null, table, column, field, oldValue, newValue)

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        /* sql */ `
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
`,
        { transaction: null }
      )
    })
  })

  describe('updateUsersFlagsEnum', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should update flags and recreate enum if valuesToRemove is provided', async () => {
      const valuesToRemove = ['value1', 'value2']
      queryInterface.sequelize.query.mockResolvedValue([[{ exists: true }]])
      await updateUsersFlagsEnum(queryInterface, transaction, valuesToRemove)
      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(8)
    })

    it('should remove specified values and recreate enum with FEATURE_FLAGS', async () => {
      // Mock the query function to resolve with a specific result
      queryInterface.sequelize.query.mockResolvedValue([[{ exists: true }], [{ exists: true }]])

      // Call the function with the mock objects and values to remove
      await updateUsersFlagsEnum(queryInterface, transaction, ['FLAG_TO_REMOVE'])

      // Check if the queries were called with the expected SQL
      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(expect.any(String), {
        transaction,
      })
    })

    it('should use specificFlags for updating and recreating enum if provided', async () => {
      const specificFlags = ['customFlag1', 'customFlag2']
      queryInterface.sequelize.query.mockResolvedValue([[{ exists: true }], [{ exists: true }]])
      await updateUsersFlagsEnum(queryInterface, transaction, ['customFlag1'], specificFlags)
      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(4)
    })

    it('should handle cases where none of the values to remove exist', async () => {
      const valuesToRemove = ['nonExistentFlag']
      queryInterface.sequelize.query.mockResolvedValue([[{ exists: false }]])
      await updateUsersFlagsEnum(queryInterface, transaction, valuesToRemove)
      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(expect.any(String), {
        transaction,
      })
      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(3) // Only the EXISTS check
    })
  })

  describe('dropAndRecreateEnum', () => {
    const enumName = 'MyEnum'
    const tableName = 'MyTable'
    const columnName = 'MyColumn'
    const enumValues = ['Value1', 'Value2']
    const enumType = 'text'

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should rename the existing type, create a new type, add values to the new type, update the columns to use the new type, and remove the old type', async () => {
      await dropAndRecreateEnum(queryInterface, transaction, enumName, tableName, columnName, enumValues, enumType)

      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(2)
    })

    it('should use default values for enumValues and enumType if not provided', async () => {
      await dropAndRecreateEnum(queryInterface, transaction, enumName, tableName, columnName)

      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(2)
    })
  })

  describe('updateSequence', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })
    it('should update the sequence of a given table', async () => {
      queryInterface.sequelize.query
        // Mock the query function to resolve with a specific result for sequence search
        .mockResolvedValueOnce([
          {
            table_name: 'Goals',
            column_name: 'id',
            sequence_name: 'Goals_id_seq',
          },
        ])
        // Mock the query function to resolve with a specific result for max value search
        .mockResolvedValueOnce([{ max: 10 }])

      // Call the function with the mock objects and table name
      await updateSequence(queryInterface, 'Goals', transaction)

      // Check if the queries were called with the expected SQL
      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.columns'),
        expect.objectContaining({
          replacements: { tableName: 'Goals' },
          transaction,
        })
      )

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('MAX'), expect.objectContaining({ transaction }))

      expect(queryInterface.sequelize.query).toHaveBeenCalledWith(expect.stringContaining('setval'), expect.objectContaining({ transaction }))
    })

    it('should throw an error if no sequences found for the table', async () => {
      // Mock the query function to resolve with an empty array (no sequences found)
      queryInterface.sequelize.query.mockResolvedValueOnce([])

      // Expect the function to throw when called with a table that has no sequences
      await expect(updateSequence(queryInterface, 'SequelizeMeta', transaction)).rejects.toThrow('No sequences found for table SequelizeMeta')
    })
  })

  describe('addValuesToEnumIfTheyDontExist', () => {
    const enumName = 'test_enum'
    const enumValues = ['value1', 'value2']

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should attempt to add each enum value if not exists', async () => {
      await addValuesToEnumIfTheyDontExist(queryInterface, transaction, enumName, enumValues)

      // Verify that the query was called with the correct SQL for each enum value,
      // trimming for any unintentional whitespace
      enumValues.forEach((enumValue) => {
        expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${enumValue}';`.trim()),
          { transaction }
        )
      })

      // Verify the query was called the correct number of times for the enumValues provided
      expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(enumValues.length)
    })
  })
})
