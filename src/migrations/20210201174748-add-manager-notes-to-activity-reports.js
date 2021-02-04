module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'ActivityReports',
      'managerNotes',
      {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
    );
  },

  down: async (queryInterface) => {
    queryInterface.removeColumn('ActivityReports', 'managerNotes');
  },
};
