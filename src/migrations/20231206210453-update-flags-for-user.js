const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration')

const FEATURE_FLAGS = [
  'resources_dashboard',
  'rttapa_form',
  'anv_statistics',
  'regional_goal_dashboard',
  'goal_source',
  'merge_goals',
  'communication_log',
  'monitoring',
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return updateUsersFlagsEnum(queryInterface, transaction, ['training_reports'], FEATURE_FLAGS)
    })
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
}
