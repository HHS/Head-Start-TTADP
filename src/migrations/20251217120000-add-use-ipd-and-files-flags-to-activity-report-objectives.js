const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.addColumn(
        'ActivityReportObjectives',
        'useIpdCourses',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'ActivityReportObjectives',
        'useFiles',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('ActivityReportObjectives', 'useIpdCourses', {
        transaction,
      })
      await queryInterface.removeColumn('ActivityReportObjectives', 'useFiles', { transaction })
    })
  },
}
