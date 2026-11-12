const fs = require('node:fs');
const path = require('node:path');
const { prepMigration } = require('../lib/migration');

const compiledAuditLogTimeseriesPath = path.resolve(
  __dirname,
  '../lib/sqlFunctions/auditLogTimeseries.js'
);

// Production migrations run from build/server/src, where these modules have
// already been compiled to JS. Local/source migrations still need tsx to require
// the TypeScript source files directly.
if (!fs.existsSync(compiledAuditLogTimeseriesPath)) {
  require('tsx/cjs'); // eslint-disable-line global-require, import/no-unresolved
}

const { recreateTimeseriesFunction } = require('../lib/sqlFunctions/auditLogTimeseries');
const {
  recreateAnomalyDetectionViews,
} = require('../tools/validation/monitoringAnomalyDetectionViews');

// Bootstraps two canonical definitions owned elsewhere in app code, each
// needing a new migration any time it changes (see their own files for why):
// - recreateTimeseriesFunction (auditLogTimeseries.ts) - also self-heals every
//   monitoring validation run, so this migration mainly covers already-deployed
//   environments ahead of the next run, and fresh environments/CI before one.
// - recreateAnomalyDetectionViews (monitoringAnomalyDetectionViews.ts) - no
//   self-healing call anywhere, so this migration is the only way any
//   environment gets it.
// 20240607000000-fix-timeseries.js remains as the historical record of how
// the function was originally created; this migration's CREATE OR REPLACE
// supersedes it going forward.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await recreateTimeseriesFunction(queryInterface, transaction);
      await recreateAnomalyDetectionViews(queryInterface, transaction);
    });
  },

  async down() {
    // No down migration: this is a sync/bootstrap migration, re-applying
    // current canonical definitions to already-deployed environments, not a
    // structural change with an obvious inverse. Dropping the views (or the
    // function, which also predates this migration) isn't a meaningful
    // "undo" here - there's nothing safe to revert to.
  },
};
