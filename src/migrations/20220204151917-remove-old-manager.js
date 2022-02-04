module.exports = {
  up: async (queryInterface) => Promise.all([
    queryInterface.removeColumn('ActivityRepors', 'oldMangagerNotes'),
    queryInterface.removeColumn('ActivityReports', 'oldApprovingManagerId'),
  ]),
  down: async (queryInterface, Sequelize) => Promise.all([
    queryInterface.addColumn('ActivityRepors', 'oldMangagerNotes', { type: Sequelize.DataTypes.TEXT }),
    queryInterface.addColumn('ActivityReports', 'oldApprovingManagerId', { type: Sequelize.DataTypes.INTEGER }),
  ]),
};
