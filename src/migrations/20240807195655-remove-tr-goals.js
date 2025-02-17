const { prepMigration, removeTables } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await removeTables(queryInterface, transaction, [
        'EventReportPilotGoals',
      ]);

      await queryInterface.sequelize.query(/* sql */`
        -- Goal 83050 is explicitly excluded from this migration. Decided by OHS during refinement on 8/7/2024.
        -- Force failure if any of these TR goals have been used on an AR.
        -- Credit to Nathan for this one.
        SELECT 1/(LEAST(COUNT(*), 1) - 1)
        FROM "ActivityReportGoals" arg
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr'
          AND "id" != 83050
        );

        -- Remove GoalSimilarityGroupGoals for Goals that were createdVia 'tr', except for goal 83050:
        -- The column on this table for goal id is "goalId":
        DELETE FROM "GoalSimilarityGroupGoals"
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr' AND "id" != 83050
        );

        -- Remove GoalStatusChanges for Goals that were createdVia 'tr':
        DELETE FROM "GoalStatusChanges"
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr' AND "id" != 83050
        );

        -- Remove Objectives for Goals that were createdVia 'tr':
        DELETE FROM "Objectives"
        WHERE "goalId" IN (
          SELECT "id"
          FROM "Goals"
          WHERE "createdVia"::text = 'tr' AND "id" != 83050
        );

        -- Remove goals that were createdVia 'tr':
        DELETE FROM "Goals"
        WHERE "createdVia"::text = 'tr' AND id != 83050;
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
