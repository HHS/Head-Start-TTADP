module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
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
    queryInterface.removeColumn('ActivityReports', 'approvingManagerId');
  },
};
