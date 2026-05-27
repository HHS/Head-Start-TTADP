const { prepMigration, addValuesToEnumIfTheyDontExist } = require('../lib/migration');
const { MAINTENANCE_TYPE } = require('../constants');

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await addValuesToEnumIfTheyDontExist(
        queryInterface,
        transaction,
        'enum_MaintenanceLogs_type',
        Object.values(MAINTENANCE_TYPE)
      );
    });
  },
  async down() {
    // Postgres does not support removing enum values so a down would be more
    // complex than it's worth.
  },
};
