module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('NextSteps', {
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
      note: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      noteType: {
        allowNull: false,
        type: Sequelize.ENUM('SPECIALIST', 'GRANTEE'),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('NextSteps');
  },
};
