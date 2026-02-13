const { updateUsersFlagsEnum } = require('../lib/migration')

const FEATURE_FLAGS = ['resources_dashboard', 'anv_statistics', 'regional_goal_dashboard', 'merge_goals', 'monitoring', 'closed_goal_merge_override']

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await updateUsersFlagsEnum(queryInterface, transaction, ['rttapa_form'], FEATURE_FLAGS)
    })
  },

  async down() {},
}
