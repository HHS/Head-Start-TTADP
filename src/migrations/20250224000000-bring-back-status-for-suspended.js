const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        -- As a result of the previous migration, we lost the ability to track
        -- the status of Goals that are suspended. This migration will bring
        -- that back for the suspended goals by correcting the status changes that were removed.

        UPDATE "GoalStatusChanges" gsc
        SET "oldStatus" = zal.old_row_data->>'oldStatus'
        FROM "ZALGoalStatusChanges" zal
        WHERE gsc.id = zal."data_id"
          AND zal.old_row_data->>'oldStatus' IS NOT NULL
          AND gsc."oldStatus" IS NULL
          AND gsc."newStatus" = 'Suspended'
          AND gsc."updatedAt" >= '2025-02-14 00:00:00'::timestamp
          AND gsc."updatedAt" < '2025-02-15 00:00:00'::timestamp;
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
