const { GOAL_SOURCES } = require('@ttahub/common')
const { prepMigration, dropAndRecreateEnum } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Goals.
      await dropAndRecreateEnum(
        queryInterface,
        transaction,
        'enum_Goals_source',
        'Goals',
        'source',
        [...GOAL_SOURCES, 'Training event follow-up'],
        'text',
        false
      )

      await queryInterface.sequelize.query(
        `UPDATE "Goals"
          SET source = 'Training event'::"enum_Goals_source"
        WHERE source = 'Training event follow-up'::"enum_Goals_source";`,
        { transaction }
      )

      await dropAndRecreateEnum(queryInterface, transaction, 'enum_Goals_source', 'Goals', 'source', GOAL_SOURCES, 'text', false)

      // ActivityReportGoals.
      await dropAndRecreateEnum(
        queryInterface,
        transaction,
        'enum_ActivityReportGoals_source',
        'ActivityReportGoals',
        'source',
        [...GOAL_SOURCES, 'Training event follow-up'],
        'text',
        false
      )

      await queryInterface.sequelize.query(
        `UPDATE "ActivityReportGoals"
          SET source = 'Training event'::"enum_ActivityReportGoals_source"
        WHERE source = 'Training event follow-up'::"enum_ActivityReportGoals_source";`,
        { transaction }
      )

      await dropAndRecreateEnum(
        queryInterface,
        transaction,
        'enum_ActivityReportGoals_source',
        'ActivityReportGoals',
        'source',
        GOAL_SOURCES,
        'text',
        false
      )
    })
  },

  async down() {
    // no rollbacks
  },
}
