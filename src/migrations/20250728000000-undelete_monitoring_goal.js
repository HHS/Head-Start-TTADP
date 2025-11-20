const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        -- A user accidentally deleted their monitoring goal
        UPDATE "Goals" SET "deletedAt" = NULL WHERE id = 102169 AND name LIKE '(Monitoring)%';
    `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        UPDATE "Goals" SET "deletedAt" = now() WHERE id = 102169 AND name LIKE '(Monitoring)%';
    `, { transaction });
    });
  },
};
