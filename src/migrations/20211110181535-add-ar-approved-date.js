module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'ActivityReports',
      'approvedAt',
      {
        comment: 'Timestamp when a report was approved',
        type: Sequelize.DATE,
        defaultValue: null,
        allowNull: true,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ActivityReports', 'approvedAt');
  },
};
