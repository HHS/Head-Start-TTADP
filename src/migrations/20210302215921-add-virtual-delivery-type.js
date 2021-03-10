module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ActivityReports',
      'virtualDeliveryType',
      {
        type: Sequelize.STRING,
      });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('ActivityReports', 'virtualDeliveryType');
  },
};
