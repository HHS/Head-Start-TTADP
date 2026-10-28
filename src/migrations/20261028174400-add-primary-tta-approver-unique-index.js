const { prepMigration } = require('../lib/migration');

const INDEX_NAME = 'unique_primary_tta_approver_per_region';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.addIndex('Permissions', ['regionId'], {
        name: INDEX_NAME,
        unique: true,
        where: { scopeId: 12 },
        transaction,
      });
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.removeIndex('Permissions', INDEX_NAME, { transaction });
    }),
};
