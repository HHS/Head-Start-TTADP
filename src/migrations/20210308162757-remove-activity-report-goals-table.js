module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('ActivityReportGoals', { force: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ActivityReportGoals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      activityReportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ActivityReports',
          },
        },
      },
      goalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Goals',
          },
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
};
