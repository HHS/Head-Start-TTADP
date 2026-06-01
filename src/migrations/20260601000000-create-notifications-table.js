const { prepMigration, removeTables } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'Notifications',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'Users',
              key: 'id',
            },
          },
          entityId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          type: {
            type: Sequelize.ENUM(['emailWhenChangeRequested']),
            allowNull: false,
          },
          link: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          label: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          text: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          isArchived: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          isViewed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          archivedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          viewedAt: {
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
    });
  },

  async down(queryInterface, _) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await removeTables(queryInterface, transaction, ['Notifications']);
    });
  },
};
