module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.addColumn('ActivityReports', 'regionId', {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'Regions',
        key: 'id',
      },
    });
  },
  down: async (queryInterface) => {
    queryInterface.removeColumn('ActivityReports', 'regionId');
  },
};
