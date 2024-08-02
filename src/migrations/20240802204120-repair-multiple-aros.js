const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // somehow this ARO was duplicated three times. This migration repairs it.
      // To verify, view the report (45555) as it's owner and confirm that the goals and
      // objectives page shows 1 goal with TTA provided and 2 files
      await queryInterface.sequelize.query(/* sql */`
        DELETE FROM "ActivityReportObjectiveFiles" WHERE "activityReportObjectiveId" IN (232020, 232022);
        DELETE FROM "ActivityReportObjectives" WHERE id IN (232020, 232022)
     
        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // If we end up needing to revert this, it would be easier to use a separate
      // migration using the txid (or a similar identifier) after it's already set
    },
  ),
};
