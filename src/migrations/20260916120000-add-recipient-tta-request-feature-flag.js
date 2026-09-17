const { FEATURE_FLAGS } = require('../constants');
const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

const RECIPIENT_TTA_REQUEST_FEATURE_FLAG = 'recipient_tta_request';
const FEATURE_FLAGS_WITHOUT_RECIPIENT_TTA_REQUEST = FEATURE_FLAGS.filter(
  (flag) => flag !== RECIPIENT_TTA_REQUEST_FEATURE_FLAG
);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(
        `
        ALTER TYPE "enum_Users_flags" ADD VALUE IF NOT EXISTS '${RECIPIENT_TTA_REQUEST_FEATURE_FLAG}';
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
        [RECIPIENT_TTA_REQUEST_FEATURE_FLAG],
        FEATURE_FLAGS_WITHOUT_RECIPIENT_TTA_REQUEST
      );
    });
  },
};
