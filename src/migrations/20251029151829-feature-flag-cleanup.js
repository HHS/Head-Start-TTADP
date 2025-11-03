const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

const FEATURE_FLAGS = [
  'anv_statistics',
  'regional_goal_dashboard',
  'quality_assurance_dashboard',
  'collaboration_report',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return updateUsersFlagsEnum(
        queryInterface,
        transaction,
        [
          'closed_goal_merge_override',
          'training_reports_dashboard',
          'manual_mark_goals_similar',
          'monitoring_integration',
          'multirecipient_communication_log',
          'standard_goals_updates',
        ],
        FEATURE_FLAGS,
      );
    });
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
};
