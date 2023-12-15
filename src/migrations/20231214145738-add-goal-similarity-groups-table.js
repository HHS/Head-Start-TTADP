const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.createTable(
        'GoalSimilarityGroups',
        {
          goals: {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            allowNull: false,
          },
          userHasInvalidated: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          finalGoalId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          goalsMerged: {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            allowNull: true,
          },
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
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
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.dropTable('GoalSimilarityGroups', { transaction });
    });
  },
};
