const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration')

const FEATURE_FLAGS = ['anv_statistics', 'regional_goal_dashboard', 'closed_goal_merge_override', 'training_reports_dashboard']

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return updateUsersFlagsEnum(queryInterface, transaction, ['merge_goals', 'monitoring', 'resources_dashboard'], FEATURE_FLAGS)
    })
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
}
