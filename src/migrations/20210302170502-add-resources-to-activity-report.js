module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction(async (transaction) => {
      await Promise.all([
        queryInterface.addColumn(
          'ActivityReports',
          'nonECLKCResourcesUsed',
          {
            type: Sequelize.ARRAY(Sequelize.TEXT),
          },
          { transaction },
        ),
        queryInterface.removeColumn('ActivityReports', 'resourcesUsed', { transaction }),
        queryInterface.addColumn(
          'ActivityReports',
          'ECLKCResourcesUsed',
          {
            type: Sequelize.ARRAY(Sequelize.TEXT),
          },
          { transaction },
        ),
      ]);
    });
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction(async (transaction) => {
      await Promise.all([
        queryInterface.removeColumn('ActivityReports', 'nonECLKCResourcesUsed', { transaction }),
        queryInterface.removeColumn('ActivityReports', 'ECLKCResourcesUsed', { transaction }),
        queryInterface.addColumn('ActivityReports', 'resourcesUsed', { type: Sequelize.TEXT }, { transaction }),
      ]);
    });
  },
};
