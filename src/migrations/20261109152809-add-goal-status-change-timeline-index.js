const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      // The Timeline looks up a goal's status as of a point in time by goal, ordered by when the
      // change was performed. Without this index each lookup scans the whole table.
      await queryInterface.sequelize.query(
        `
          CREATE INDEX IF NOT EXISTS "GoalStatusChanges_goalId_changedAt_id"
          ON "GoalStatusChanges" ("goalId", (COALESCE("performedAt", "createdAt")), "id")
          WHERE "newStatus" IS NOT NULL;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "GoalStatusChanges_goalId_changedAt_id";',
        { transaction }
      );
    });
  },
};
