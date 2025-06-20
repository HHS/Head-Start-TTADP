module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ActivityReports', 'regionId', {
      type: Sequelize.DataTypes.INTEGER,
      references: {
        model: 'Regions',
        key: 'id',
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('ActivityReports', 'regionId');
  },
};
