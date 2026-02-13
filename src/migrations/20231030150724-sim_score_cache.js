const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.createTable('SimScoreGoalCaches', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        recipient_id: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Recipients',
            },
          },
        },
        goal1: {
          allowNull: false,
          type: Sequelize.INTEGER,
          default: null,
          references: {
            model: {
              tableName: 'Goals',
            },
          },
        },
        goal2: {
          allowNull: false,
          type: Sequelize.INTEGER,
          default: null,
          references: {
            model: {
              tableName: 'Goals',
            },
          },
        },
        score: { allowNull: false, type: Sequelize.DECIMAL(3, 1) },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      })
    })
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.dropTable('SimScoreGoalCaches', { transaction })
    })
  },
}
