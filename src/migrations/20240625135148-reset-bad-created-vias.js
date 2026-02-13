const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Goals"
        SET "createdVia" = 'merge'
        WHERE id IN (69403, 78365) AND "createdVia" = 'imported'; -- Nathan helpfully provided me with these IDs based on the audit log
        `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      // No need to put back bad data
    }),
}
