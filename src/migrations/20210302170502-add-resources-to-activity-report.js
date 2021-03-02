module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('ActivityReports',
        'nonECLKCResourcesUsed',
        {
          type: Sequelize.ARRAY(Sequelize.STRING),
        }, { transaction });
      await queryInterface.removeColumn('ActivityReports', 'resourcesUsed', { transaction });
      await queryInterface.addColumn('ActivityReports',
        'ECLKCResourcesUsed',
        {
          type: Sequelize.ARRAY(Sequelize.STRING),
        }, { transaction });
    });
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('ActivityReports', 'nonECLKCResourcesUsed', { transaction });
      await queryInterface.removeColumn('ActivityReports', 'ECLKCResourcesUsed', { transaction });
      await queryInterface.addColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.TEXT }, { transaction });
    });
  },
};
