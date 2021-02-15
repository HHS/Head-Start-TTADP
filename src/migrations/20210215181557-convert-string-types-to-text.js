module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.TEXT });
    await queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.TEXT });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.STRING });
    await queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.STRING });
  },
};
