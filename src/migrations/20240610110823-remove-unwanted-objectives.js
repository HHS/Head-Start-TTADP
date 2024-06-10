const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
      -- Delete ARO's.
      DELETE FROM "ActivityReportObjectives" WHERE "objectiveId" IN (
        SELECT id FROM "Objectives" WHERE id IN (
            179385,
            179427,
            179494,
            179500,
            179550,
            179606,
            179635,
            179556,
            180440,
            177557) AND "status" = 'Not Started'
      );

        -- Delete objectives.
        DELETE FROM "Objectives" WHERE id IN (
          179385,
          179427,
          179494,
          179500,
          179550,
          179606,
          179635,
          179556,
          180440,
          177557) AND "status" = 'Not Started';
        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // No need to put back unwanted objectives.
    },
  ),
};
