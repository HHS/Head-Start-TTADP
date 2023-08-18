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
 * Adds a column to multiple tables using the provided query interface and transaction.
 * @param {Object} queryInterface - The query interface object.
 * @param {Object} transaction - The transaction object.
 * @param {string} column - The name of the column to be added.
 * @param {Array<string>} tables - An array of table names to add the column to.
 * @returns {Promise<Array>} - A promise that resolves to an array of promises representing
 * the addition of the column to each table.
 */
const addColumnToTables = async (
  queryInterface,
  transaction,
  column,
  columnConfig,
  tables,
) => Promise.all(tables.map(async (
  table,
  // Add the column to the current table using the provided query interface and transaction.
) => queryInterface.addColumn(table, column, columnConfig, { transaction })));

/**
 * Removes a column from multiple tables in a database.
 *
 * @param {Object} queryInterface - The query interface object for executing database queries.
 * @param {Object} transaction - The transaction object for performing the operation within a
 * transaction.
 * @param {string} column - The name of the column to be removed.
 * @param {Array<string>} tables - An array of table names from which the column should be removed.
 * @returns {Promise<Array>} - A promise that resolves to an array of promises representing the
 * removal of the column from each table.
 */
const removeColumnFromTables = async (
  queryInterface,
  transaction,
  column,
  tables,
) => Promise.all(tables.map(async (
  table,
  // Remove the specified column from the current table using the queryInterface's removeColumn
  // method.
  // Pass the transaction object to ensure the operation is performed within the same transaction.
) => queryInterface.removeColumn(table, column, { transaction })));

module.exports = {
  prepMigration,
  setAuditLoggingState,
  removeTables,
  addColumnToTables,
  removeColumnFromTables,
};
