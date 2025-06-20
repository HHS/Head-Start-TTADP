/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.removeColumn('ActivityReports', 'oldManagerNotes', { transaction }),
    queryInterface.removeColumn('ActivityReports', 'oldApprovingManagerId', { transaction }),
  ])),
  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.addColumn('ActivityReports', 'oldManagerNotes', { type: Sequelize.DataTypes.TEXT }, { transaction }),
    queryInterface.addColumn('ActivityReports', 'oldApprovingManagerId', { type: Sequelize.DataTypes.INTEGER }, { transaction }),
  ])),
};
