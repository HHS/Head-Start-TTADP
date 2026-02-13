const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        `
      UPDATE "ActivityReports"
        SET "reason" = ARRAY_REPLACE("reason", 'Child Incidents', 'Child Incident')
        WHERE "reason" @> '{"Child Incidents"}';
    `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        `
      UPDATE "ActivityReports"
        SET "reason" = ARRAY_REPLACE("reason", 'Child Incident', 'Child Incidents')
        WHERE "reason" @> '{"Child Incident"}';
    `,
        { transaction }
      )
    })
  },
}
