module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'ActivityReports',
      'approvingManagerId',
      {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ActivityReports', 'approvingManagerId');
  },
};
