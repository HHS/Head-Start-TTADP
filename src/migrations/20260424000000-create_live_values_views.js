const fs = require('fs');
const path = require('path');
const { prepMigration } = require('../lib/migration');

const compiledUpdateMonitoringFactTablesPath = path.resolve(
  __dirname,
  '../tools/updateMonitoringFactTables.js'
);

// Production migrations run from build/server/src, where updateMonitoringFactTables
// has already been compiled to JS. Local/source migrations still need tsx to require
// the TypeScript source file directly.
if (!fs.existsSync(compiledUpdateMonitoringFactTablesPath)) {
  require('tsx/cjs'); // eslint-disable-line global-require, import/no-unresolved
}

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
