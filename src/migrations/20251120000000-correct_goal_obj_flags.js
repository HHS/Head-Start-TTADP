const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(`
      -- Adding a new type to accept flag maintenance DB jobs
      ALTER TYPE "enum_MaintenanceLogs_type" ADD VALUE 'CORRECT AR FLAGS';
      `, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await await queryInterface.sequelize.query(/* sql */`
      -- Presumably if we want to roll back, we want the flag alteration
      -- maintenance logs cleared out
      CREATE TYPE "OLDenum_MaintenanceLogs_type" AS ENUM (
        'DAILY DB MAINTENANCE',
        'VACUUM TABLES',
        'IMPORT_PROCESS',
        'CLEAR MAINTENANCE LOGS',
        'IMPORT_DOWNLOAD',
        'REINDEX TABLES',
        'VACUUM ANALYZE',
        'REINDEX'
      );

      DELETE FROM "MaintenanceLogs" WHERE type = 'CORRECT AR FLAGS';

      ALTER TABLE "MaintenanceLogs" ALTER COLUMN "type" TYPE "OLDenum_MaintenanceLogs_type"
      USING "type"::text::"OLDenum_MaintenanceLogs_type";

      DROP TYPE "enum_MaintenanceLogs_type";

      ALTER TYPE "OLDenum_MaintenanceLogs_type" RENAME TO "enum_MaintenanceLogs_type";
      `, { transaction });
    });
  },
};
