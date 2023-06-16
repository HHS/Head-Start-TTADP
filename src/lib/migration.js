const prepMigration = async (
  queryInterface,
  transaction,
  sessionSig,
  auditDescriptor = 'RUN MIGRATIONS',
  loggedUser = '0',
) => queryInterface.sequelize.query(
  `SELECT
        set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
        set_config('audit.transactionId', NULL, TRUE) as "transactionId",
        set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
        set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
  { transaction },
);

const setAuditLoggingState = async (
  queryInterface,
  transaction,
  enable = true,
) => queryInterface.sequelize.query(
  `SELECT "ZAFSetTriggerState"(null, null, null, '${enable ? 'ENABLE' : 'DISABLE'}');`,
  { transaction },
);

const removeTables = async (
  queryInterface,
  transaction,
  tables = [],
) => {
  await setAuditLoggingState(queryInterface, transaction, false);
  await Promise.all(['DBMaintenanceLogs']
    .map(async (table) => {
      const promises = [];
      await queryInterface.sequelize.query(
        ` SELECT "ZAFRemoveAuditingOnTable"('${table}');`,
        { raw: true, transaction },
      );
      // Drop old audit log table
      await queryInterface.sequelize.query(`TRUNCATE TABLE "${table}";`, { transaction });
      await queryInterface.dropTable(`ZAL${table}`, { transaction });
      await queryInterface.dropTable(table, { transaction });
      return null;
    }));
  await setAuditLoggingState(queryInterface, transaction, true);
};

module.exports = {
  prepMigration,
  setAuditLoggingState,
  removeTables,
};
