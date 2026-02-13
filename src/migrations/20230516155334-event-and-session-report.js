/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS "EventReportPilots" (
          id SERIAL PRIMARY KEY,
          "ownerId" INTEGER NOT NULL,
          "pocId" INTEGER NULL,
          "collaboratorIds" INTEGER[] NOT NULL,
          "regionId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          data JSONB NOT NULL
        );
        `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS "SessionReportPilots" (
          id SERIAL PRIMARY KEY,
          "eventId" INTEGER NOT NULL,
          data JSONB NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("eventId") REFERENCES "EventReportPilots" (id)
        );
        `,
        { transaction }
      )
    }),

  down: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'REVERT MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction }
      )

      await Promise.all(
        ['EventReportPilots', 'SessionReportPilots'].map(async (table) => {
          await queryInterface.sequelize.query(` SELECT "ZAFRemoveAuditingOnTable"('${table}');`, {
            raw: true,
            transaction,
          })
          // Drop old audit log table
          await queryInterface.sequelize.query(`TRUNCATE TABLE "${table}";`, { transaction })
          await queryInterface.dropTable(`ZAL${table}`, { transaction })
          await queryInterface.dropTable(table, { transaction })
        })
      )
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction }
      )
    }),
}
