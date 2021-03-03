module.exports = {
  up: (queryInterface, Sequelize) => (
    Promise.all([
      queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.TEXT }),
      queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.TEXT }),
      queryInterface.changeColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.TEXT }),
    ])
  ),

  down: (queryInterface, Sequelize) => (
    Promise.all([
      queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.STRING }),
      queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.STRING }),
      queryInterface.changeColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.STRING }),
    ])
  ),
};
