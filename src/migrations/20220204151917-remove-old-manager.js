module.exports = {
  up: async (queryInterface) => Promise.all([
    queryInterface.removeColumn('ActivityRepors', 'oldMangagerNotes'),
    queryInterface.removeColumn('ActivityReports', 'oldManagerId'),
  ]),
  down: async (queryInterface, Sequelize) => Promise.all([
    queryInterface.addColumn('ActivityRepors', 'oldMangagerNotes', { type: Sequelize.DataTypes.TEXT }),
    queryInterface.addColumn('ActivityReports', 'oldManagerId', { type: Sequelize.DataTypes.INTEGER }),
  ]),
};
