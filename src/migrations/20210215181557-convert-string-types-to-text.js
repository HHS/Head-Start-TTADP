module.exports = {
  up: async (queryInterface, Sequelize) => {
    Promise.all([
      queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.TEXT }),
      queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.TEXT }),
      queryInterface.changeColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.TEXT }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    Promise.all([
      queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.STRING }),
      queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.STRING }),
      queryInterface.changeColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.STRING }),
    ]);
  },
};
