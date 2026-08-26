const { FEATURE_FLAGS } = require('../constants');
const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

const TTA_TIMELINE_FEATURE_FLAG = 'tta_timeline';
const FEATURE_FLAGS_WITHOUT_TTA_TIMELINE = FEATURE_FLAGS.filter(
  (flag) => flag !== TTA_TIMELINE_FEATURE_FLAG
);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(
        `
        ALTER TYPE "enum_Users_flags" ADD VALUE IF NOT EXISTS '${TTA_TIMELINE_FEATURE_FLAG}';
      `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return updateUsersFlagsEnum(
        queryInterface,
        transaction,
        [TTA_TIMELINE_FEATURE_FLAG],
        FEATURE_FLAGS_WITHOUT_TTA_TIMELINE
      );
    });
  },
};
