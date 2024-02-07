module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'ActivityReports',
      'managerNotes',
      {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ActivityReports', 'managerNotes');
  },
};
