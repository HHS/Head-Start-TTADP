module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.TEXT }, { transaction }),
      queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.TEXT }, { transaction }),
      queryInterface.changeColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.TEXT }, { transaction }),
    ])
  )),

  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.changeColumn('ActivityReports', 'additionalNotes', { type: Sequelize.STRING }, { transaction }),
      queryInterface.changeColumn('ActivityReports', 'context', { type: Sequelize.STRING }, { transaction }),
      queryInterface.changeColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.STRING }, { transaction }),
    ])
  )),
};
