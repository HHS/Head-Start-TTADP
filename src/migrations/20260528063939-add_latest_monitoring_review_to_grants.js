module.exports = {
  async up(queryInterface) {
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
