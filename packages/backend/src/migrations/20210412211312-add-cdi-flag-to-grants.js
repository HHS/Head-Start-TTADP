module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.addColumn(
        'Grants',
        'cdi',
        { type: Sequelize.BOOLEAN, defaultValue: false },
        { transaction },
      );
      await queryInterface.sequelize.query('UPDATE "Grants" SET "cdi" = true WHERE "regionId" = 13', { transaction });
    },
  ),

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Grants', 'cdi');
  },
};
