const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
        UPDATE "Goals"
        SET "onApprovedAR" = NOT "onApprovedAR"
        WHERE "id" IN (
        SELECT
            g.id
        FROM "Goals" g
        JOIN "ActivityReportGoals" ar
        ON g.id = ar."goalId"
        JOIN "ActivityReports" a
        ON ar."activityReportId" = a.id
        group by 1
        having g."onApprovedAR" != ('approved' = ANY (array_agg(DISTINCT a."calculatedStatus"::text)))
      )
        `,
        { transaction }
      )
    })
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
}
