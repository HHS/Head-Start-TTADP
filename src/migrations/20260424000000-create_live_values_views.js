// tsx/cjs is registered here so this CommonJS migration file can require TypeScript
// source directly. This keeps the view SQL in one place (updateMonitoringFactTables.ts)
// without requiring a separate build step before running migrations.
// NOTE: If updateMonitoringFactTables.ts is ever moved or renamed, update the path below.
require('tsx/cjs'); // eslint-disable-line import/no-unresolved
const { prepMigration } = require('../lib/migration');
const { recreateLiveValuesViews } = require('../tools/updateMonitoringFactTables');

// This migration exists solely to make the views available on fresh environments
// and in CI before the nightly pipeline has run. The view SQL is defined and
// owned in updateMonitoringFactTables.ts — see recreateLiveValuesViews there for
// the canonical definitions and guidance on when a new migration is needed.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await recreateLiveValuesViews(queryInterface, transaction);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
        DROP VIEW IF EXISTS citations_live_values;
        DROP VIEW IF EXISTS deliveredreviews_live_values;
      `,
        { transaction }
      );
    });
  },
};
