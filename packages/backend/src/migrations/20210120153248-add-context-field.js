module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'ActivityReports',
      'context',
      {
        type: Sequelize.DataTypes.STRING,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ActivityReports', 'context');
  },
};
