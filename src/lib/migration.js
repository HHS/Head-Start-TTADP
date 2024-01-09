const { FEATURE_FLAGS } = require('../constants');

/**
 * Sets audit configuration values for a database migration.
 * @param {Object} queryInterface - The Sequelize Query Interface object.
 * @param {Object} transaction - The Sequelize Transaction object.
 * @param {string} sessionSig - A unique identifier for the current session.
 * @param {string} [auditDescriptor='RUN MIGRATIONS'] - A description of the audit event.
 * @param {string} [loggedUser='0'] - The user ID associated with the audit event.
 * @returns {Promise} - A Promise that resolves when the audit configuration is set.
 */
const prepMigration = async (
  queryInterface,
  transaction,
  sessionSig,
  auditDescriptor = 'RUN MIGRATIONS',
  loggedUser = '0',
) => queryInterface.sequelize.query(
  // Set audit configuration values using the provided parameters
  `SELECT
      set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
  { transaction },
);

/**
 * Sets the audit logging state by calling a stored procedure in the database.
 * @param {Object} queryInterface - The Sequelize QueryInterface object.
 * @param {Object} transaction - The Sequelize Transaction object.
 * @param {Boolean} enable - Whether to enable or disable audit logging. Default is true.
 */
const setAuditLoggingState = async (
  queryInterface,
  transaction,
  enable = true,
) => queryInterface.sequelize.query(
  // Calls the ZAFSetTriggerState stored procedure with the given enable parameter.
  `SELECT "ZAFSetTriggerState"(null, null, null, '${enable ? 'ENABLE' : 'DISABLE'}');`,
  { transaction },
);

/**
 * Removes specified tables and their audit logs from the database.
 * @async
 * @param {Object} queryInterface - The interface for executing queries.
 * @param {Object} transaction - The current transaction.
 * @param {Array} tables - An array of table names to remove.
 */
const removeTables = async (
  queryInterface,
  transaction,
  tables = [],
) => {
  if (tables.length) {
    // Disable audit logging during table removal
    await setAuditLoggingState(queryInterface, transaction, false);
    // Remove each table and its audit log in parallel
    await Promise.all(tables.map(async (table) => {
      // Call stored procedure to remove auditing on table
      await queryInterface.sequelize.query(
        ` SELECT "ZAFRemoveAuditingOnTable"('${table}');`,
        { raw: true, transaction },
      );
      // Drop audit log table
      await queryInterface.dropTable(`ZAL${table}`, { transaction });
      // Drop main table
      await queryInterface.dropTable(table, { transaction });
      return null;
    }));
    // Re-enable audit logging
    await setAuditLoggingState(queryInterface, transaction, true);
  }
};

/**
 * Updates an enum with the provided values if they don't already exist.
 * @async
 * @param {Object} queryInterface - The interface for executing queries.
 * @param {string} enumName - Name of the enum to add values to...
 *  in sequelize, theses are formatted like "enum_Goals_createdVia"
 * @param {String[]} enumValues - Array of enum values to add.
 */
const addValuesToEnumIfTheyDontExist = async (
  queryInterface,
  transaction,
  enumName,
  enumValues = [],
) => Promise.all(Object.values(enumValues).map((enumValue) => queryInterface.sequelize.query(`
  ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${enumValue}';
`, { transaction })));

/**
 * Replaces a specific value in an array column of a table with a new value.
 *
 * @param {Object} queryInterface - The query interface object provided by Sequelize.
 * @param {string} table - The name of the table to update.
 * @param {string} column - The name of the column containing the array.
 * @param {any} oldValue - The value to be replaced in the array.
 * @param {any} newValue - The new value to replace the old value with.
 * @returns {Promise} - A promise that resolves when the update query is executed successfully.
 */
const replaceValueInArray = async (
  queryInterface,
  transaction,
  table,
  column,
  oldValue,
  newValue,
) => queryInterface.sequelize.query(/* sql */`
  UPDATE "${table}"
  SET "${column}" = array_replace("${column}", '${oldValue}', '${newValue}')
  WHERE "${column}" @> ARRAY['${oldValue}']::VARCHAR[];
`, { transaction });

/**
 * Replaces a specific value in a JSONB array within a PostgreSQL table column.
 *
 * @param {object} queryInterface - The Sequelize query interface object.
 * @param {string} table - The name of the table to update.
 * @param {string} column - The name of the column containing the JSONB array.
 * @param {string} field - The key of the field within the JSONB array.
 * @param {any} oldValue - The value to be replaced within the JSONB array.
 * @param {any} newValue - The new value to replace the old value with.
 * @returns {Promise<void>} - A promise that resolves when the update is complete.
 */
const replaceValueInJSONBArray = async (
  queryInterface,
  transaction,
  table,
  column,
  field,
  oldValue,
  newValue,
) => queryInterface.sequelize.query(/* sql */`
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
`, { transaction });

const dropAndRecreateEnum = async (
  queryInterface,
  transaction,
  enumName,
  tableName,
  columnName,
  enumValues = [],
  enumType = 'text',
) => {
  await queryInterface.sequelize.query(`
  -- rename the existing type
  ALTER TYPE "${enumName}" RENAME TO "${enumName}_old";
  -- create the new type
  CREATE TYPE "${enumName}" AS ENUM(
    ${enumValues.map((enumValue) => `'${enumValue}'`).join(',\n')}
  );`, { transaction });

  return queryInterface.sequelize.query(`
  -- update the columns to use the new type
  ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" set default null;
  ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE "${enumName}"[] USING "${columnName}"::${enumType}[]::"${enumName}"[];
  ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" set default ARRAY[]::"${enumName}"[];
  -- remove the old type
  DROP TYPE "${enumName}_old";
`, { transaction });
};

/**
 *  Updates all users' flags by removing the specified values and adding all the values
 *  from the source of truth, which is the FEATURE_FLAGS constant in src/constants.js
 *   - so you only specify the values you want to remove here.
 *
 * @param {sequelize.queryInterface} queryInterface
 * @param {string[]} valuesToRemove
 * @returns Promise<any>
 */
const updateUsersFlagsEnum = async (queryInterface, transaction, valuesToRemove = []) => {
  const enumName = 'enum_Users_flags';
  const tableName = 'Users';
  const columnName = 'flags';

  if (valuesToRemove && valuesToRemove.length) {
    const existingEnums = await Promise.all(
      valuesToRemove.map(async (value) => {
        /**
         * because we run this function multiple times when setting up a test DB
         * We need to check if the enum value exists before trying to remove it
         * (it won't, if it's not in the constants.js FEATURE_FLAGS array)
         */
        const result = await queryInterface.sequelize.query(`
          SELECT EXISTS(
            SELECT 1
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = '${enumName}' AND e.enumlabel = '${value}'
          );
        `, { transaction });

        const enumIsValid = result[0][0].exists;

        if (enumIsValid) {
          return value;
        }

        return null;
      }),
    );

    const validForRemove = existingEnums.filter((value) => value);

    await Promise.all(validForRemove.map((value) => queryInterface.sequelize.query(`
      UPDATE "${tableName}" SET "${columnName}" = array_remove(${columnName}, '${value}')
        WHERE '${value}' = ANY(${columnName});
  `, { transaction })));

    return dropAndRecreateEnum(
      queryInterface,
      transaction,
      enumName,
      tableName,
      columnName,
      FEATURE_FLAGS,
    );
  }

  return addValuesToEnumIfTheyDontExist(
    queryInterface,
    transaction,
    enumName,
    FEATURE_FLAGS,
  );
};

module.exports = {
  prepMigration,
  setAuditLoggingState,
  removeTables,
  dropAndRecreateEnum,
  addValuesToEnumIfTheyDontExist,
  updateUsersFlagsEnum,
  replaceValueInArray,
  replaceValueInJSONBArray,
};
