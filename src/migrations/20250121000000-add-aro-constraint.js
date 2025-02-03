const { prepMigration, removeTables } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "activity_report_objectives_activity_report_id_objective_id";
        CREATE UNIQUE INDEX  "activity_report_objectives_activity_report_id_objective_id_unique" ON "ActivityReportObjectives" ("activityReportId","objectiveId");
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "activity_report_objectives_activity_report_id_objective_id_unique";
        CREATE INDEX "activity_report_objectives_activity_report_id_objective_id" ON "ActivityReportObjectives" ("activityReportId","objectiveId");
      `, { transaction });
    },
  ),
};
