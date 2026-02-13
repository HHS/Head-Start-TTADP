const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.createTable('GoalStatusChanges', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        goalId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Goals',
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
        userName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        userRoles: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
        },
        oldStatus: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        newStatus: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        reason: {
          // longer text
          type: Sequelize.TEXT,
          allowNull: false,
        },
        context: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
      })
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await removeTables(queryInterface, transaction, ['GoalStatusChanges'])
    })
  },
}
