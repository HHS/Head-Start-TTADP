const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(/* sql */`
        UPDATE public."Imports"
        SET schedule = '30 2,8,14,20 * * *'
        WHERE id = 1;
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(/* sql */`
        UPDATE public."Imports"
        SET schedule = '30 8 * * *'
        WHERE id = 1;
      `, { transaction });
    },
  ),
};
