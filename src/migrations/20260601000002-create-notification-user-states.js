const { prepMigration, removeTables } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'NotificationUserStates',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          notificationId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Notifications',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          viewedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          archivedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('NotificationUserStates', ['notificationId', 'userId'], {
        unique: true,
        transaction,
      });

      await queryInterface.sequelize.query(
        /* sql */ `
          INSERT INTO "NotificationUserStates" (
            "notificationId",
            "userId",
            "viewedAt",
            "archivedAt",
            "createdAt",
            "updatedAt"
          )
          SELECT
            n.id,
            n."userId",
            n."viewedAt",
            n."archivedAt",
            n."createdAt",
            n."updatedAt"
          FROM "Notifications" n
          WHERE n."userId" IS NOT NULL
            AND (
              n."viewedAt" IS NOT NULL
              OR n."archivedAt" IS NOT NULL
            );
        `,
        { transaction }
      );

      await queryInterface.removeColumn('Notifications', 'viewedAt', { transaction });
      await queryInterface.removeColumn('Notifications', 'archivedAt', { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn(
        'Notifications',
        'archivedAt',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Notifications',
        'viewedAt',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        /* sql */ `
          UPDATE "Notifications" n
          SET
            "archivedAt" = nus."archivedAt",
            "viewedAt" = nus."viewedAt"
          FROM "NotificationUserStates" nus
          WHERE n.id = nus."notificationId"
            AND n."userId" = nus."userId"
            AND n."userId" IS NOT NULL;
        `,
        { transaction }
      );

      await removeTables(queryInterface, transaction, ['NotificationUserStates']);
    });
  },
};
