const { prepMigration } = require('../lib/migration');

const FEATURE_FLAGS = [
  'anv_statistics',
  'regional_goal_dashboard',
  'closed_goal_merge_override',
  'training_reports_dashboard',
  'quality_assurance_dashboard',
  'manual_mark_goals_similar',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return Promise.all(Object.values(FEATURE_FLAGS)
        .map((action) => queryInterface.sequelize.query(/* sql */`
          ALTER TYPE "enum_Users_flags"
          ADD VALUE IF NOT EXISTS '${action}';
        `)));
    });
  },

  async down() {
    // no rollbacks
  },
};
