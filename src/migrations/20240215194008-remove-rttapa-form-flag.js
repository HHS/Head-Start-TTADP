const { updateUsersFlagsEnum } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await updateUsersFlagsEnum(queryInterface, transaction, ['rttapa_form']);
    });
  },

  async down() {},
};
