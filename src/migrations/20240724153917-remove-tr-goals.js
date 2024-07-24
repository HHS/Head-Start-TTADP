const { prepMigration, removeTables } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await removeTables(queryInterface, transaction, [
        'EventReportPilotGoals',
      ]);

      await queryInterface.sequelize.query(/* sql */`
        -- Force failure if any of these TR goals have been used on an AR:
        -- Credit to Nathan for this one.
        SELECT 1/(LEAST(COUNT(*), 1) - 1)
        FROM "ActivityReportGoals" arg
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr'
        );

        -- Remove GoalStatusChanges for Goals that were createdVia 'tr':
        DELETE FROM "GoalStatusChanges"
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr'
        );

        -- Remove Objectives for Goals that were createdVia 'tr':
        DELETE FROM "Objectives"
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr'
        );

        -- Remove goals that were createdVia 'tr':
        DELETE FROM "Goals"
        WHERE "createdVia"::text = 'tr';
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
