const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        CREATE INDEX IF NOT EXISTS activity_reports_reason_gin
          ON "ActivityReports" USING gin("reason");
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(/* sql */`
        DROP INDEX IF EXISTS activity_reports_reason_gin;
      `, { transaction });
    });
  },
};
