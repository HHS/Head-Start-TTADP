module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction((transaction) => Promise.all([
      queryInterface.addColumn(
        'Grants',
        'cdi',
        { type: Sequelize.BOOLEAN, defaultValue: false },
        { transaction },
      ),
      queryInterface.sequelize.query('UPDATE "Grants" SET "cdi" = true WHERE "regionId" = 13', { transaction }),
    ]));
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Grants', 'cdi');
  },
};
