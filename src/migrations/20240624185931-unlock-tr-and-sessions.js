const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "SessionReportPilots"
        SET data = jsonb_set(data, '{status}', '"In progress"', true)
        WHERE "eventId" = 48;

        UPDATE "EventReportPilots"
        SET data = jsonb_set(data, '{status}', '"In progress"', true)
        WHERE "id" = 48;
        `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      // No down migration needed here
    }),
}
