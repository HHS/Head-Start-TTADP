const { FEATURE_FLAGS } = require('../constants');
const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

const TTA_HOURS_FEATURE_FLAG = 'tta_hours_provided_over_time';
const FEATURE_FLAGS_WITHOUT_TTA_HOURS = FEATURE_FLAGS.filter(
  (flag) => flag !== TTA_HOURS_FEATURE_FLAG
);

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      return queryInterface.sequelize.query(
        `ALTER TYPE "enum_Users_flags" ADD VALUE IF NOT EXISTS '${TTA_HOURS_FEATURE_FLAG}';`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      return updateUsersFlagsEnum(
        queryInterface,
        transaction,
        [TTA_HOURS_FEATURE_FLAG],
        FEATURE_FLAGS_WITHOUT_TTA_HOURS
      );
    });
  },
};
