const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration')

const FEATURE_FLAGS = [
  'resources_dashboard',
  'rttapa_form',
  'anv_statistics',
  'regional_goal_dashboard',
  'merge_goals',
  'monitoring',
  'closed_goal_merge_override',
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return updateUsersFlagsEnum(queryInterface, transaction, ['goal_source'], FEATURE_FLAGS)
    })
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
}
