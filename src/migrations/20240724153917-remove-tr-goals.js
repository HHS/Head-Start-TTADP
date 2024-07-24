const { prepMigration, removeTables } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await removeTables(queryInterface, transaction, [
        'EventReportPilotGoals',
      ]);

      await queryInterface.sequelize.query(/* sql */`
        -- Remove goals that were createdVia 'tr':
        DELETE FROM "Goals"
        WHERE "createdVia" = 'tr';
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
