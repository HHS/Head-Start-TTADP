const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.createTable(
        'GoalSimilarityGroups',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          userHasInvalidated: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          finalGoalId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: {
                tableName: 'Goals',
              },
            },
          },
          recipientId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
              model: {
                tableName: 'Recipients',
              },
            },
          },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        { transaction }
      )
      await queryInterface.createTable(
        'GoalSimilarityGroupGoals',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          goalSimilarityGroupId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
              model: {
                tableName: 'GoalSimilarityGroups',
              },
            },
          },
          goalId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
              model: {
                tableName: 'Goals',
              },
            },
          },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
      ALTER TABLE "GoalSimilarityGroupGoals" ADD CONSTRAINT "GoalSimilarityGroupGoals_goalSimilarityGroupId_goalId_unique" UNIQUE ("goalSimilarityGroupId", "goalId");
    `,
        { transaction }
      )
    })
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.dropTable('GoalSimilarityGroupGoals', { transaction })
      await queryInterface.dropTable('GoalSimilarityGroups', { transaction })
    })
  },
}
