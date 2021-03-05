module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'ActivityReports',
      'legacyId',
      {
        comment: 'Legacy identifier taken from smartsheet ReportID. Some ids adjusted to match their region.',
        type: Sequelize.STRING,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Users', 'legacyId');
  },
};
