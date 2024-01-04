const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(
        `DELETE FROM "ActivityReportObjectiveTopics"
        WHERE "activityReportObjectiveId" IN (
            SELECT aro."id"
            FROM "ActivityReportObjectives" aro
            INNER JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar.id
            WHERE aro.id IN (
                SELECT ("new_row_data"->'activityReportObjectiveId')::int
                FROM "ZALActivityReportObjectiveTopics" where "dml_txid" = '00000000-0000-0000-0000-000002266502'
            )
            AND ar."version" = 1
        );`,
        { transaction },
      );
    });
  },

  down: async () => {},
};
