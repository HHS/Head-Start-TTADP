module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'ActivityReports',
      'context',
      {
        type: Sequelize.DataTypes.STRING,
      },
    );
  },

  down: async (queryInterface) => {
    queryInterface.removeColumn('ActivityReports', 'context');
  },
};
