module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Grants', 'latestMonitoringReviewDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('Grants', 'latestMonitoringReviewType', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Grants', 'latestMonitoringReviewOutcome', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Grants', 'latestMonitoringReviewDate');
    await queryInterface.removeColumn('Grants', 'latestMonitoringReviewType');
    await queryInterface.removeColumn('Grants', 'latestMonitoringReviewOutcome');
  },
};
