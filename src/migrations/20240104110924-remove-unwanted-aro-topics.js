const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        `DELETE FROM  "ActivityReportObjectiveTopics" arot
        USING "ActivityReportObjectives" aro
        JOIN "ZALActivityReportObjectiveTopics" zaro
          ON dml_txid = '00000000-0000-0000-0000-000002266502'
          AND aro.id = (zaro.new_row_data->>'activityReportObjectiveId')::int
        JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
          AND ar.version = 1
        WHERE arot."activityReportObjectiveId" = aro.id;`,
        { transaction }
      )
    })
  },

  down: async () => {},
}
