const { prepMigration, removeTables } = require('../lib/migration');

// Outbox for S3 deletes. A row is written in the same transaction that deletes a File, so the
// S3 cleanup survives a queue outage: the S3 job marks the row complete, and a cron job
// re-enqueues rows that are still pending.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.createTable(
        'FileDeletions',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          // No foreign key: the File row is deleted in the same transaction.
          fileId: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          key: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          attempts: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          completedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      // The retry sweep only looks at pending rows.
      await queryInterface.sequelize.query(
        /* sql */ `
        CREATE INDEX "file_deletions_pending"
          ON "FileDeletions" ("updatedAt")
          WHERE "completedAt" IS NULL;
      `,
        { transaction }
      );
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await removeTables(queryInterface, transaction, ['FileDeletions']);
    }),
};
