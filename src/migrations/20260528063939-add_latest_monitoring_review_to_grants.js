module.exports = {
  async up(queryInterface) {
    // IF NOT EXISTS guards are required because updateMonitoringFactTables may have already
    // added these columns defensively when called from an earlier migration.
    await queryInterface.sequelize.query(`
      ALTER TABLE "Grants"
        ADD COLUMN IF NOT EXISTS "latestMonitoringReviewDate"    DATE,
        ADD COLUMN IF NOT EXISTS "latestMonitoringReviewType"    TEXT,
        ADD COLUMN IF NOT EXISTS "latestMonitoringReviewOutcome" TEXT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Grants', 'latestMonitoringReviewDate');
    await queryInterface.removeColumn('Grants', 'latestMonitoringReviewType');
    await queryInterface.removeColumn('Grants', 'latestMonitoringReviewOutcome');
  },
};
