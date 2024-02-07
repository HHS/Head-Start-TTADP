module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     */
    await queryInterface.addColumn(
      'ActivityReports',
      'imported',
      {
        type: Sequelize.JSONB,
        comment: 'Storage for raw values from smartsheet CSV imports',
      },
    );
  },

  down: async (queryInterface) => {
    /**
     * Add reverting commands here.
     */
    await queryInterface.removeColumn('ActivityReports', 'imported');
  },
};
