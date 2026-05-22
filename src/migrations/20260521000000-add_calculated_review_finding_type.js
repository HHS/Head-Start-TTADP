module.exports = {
  async up(queryInterface) {
    // IF NOT EXISTS guard: updateMonitoringFactTables may have already added this column
    // when called from an earlier migration during a fresh db setup. See TTAHUB-5287.
    await queryInterface.sequelize.query(
      'ALTER TABLE "DeliveredReviewCitations" ADD COLUMN IF NOT EXISTS calculated_review_finding_type TEXT'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "DeliveredReviewCitations" DROP COLUMN IF EXISTS calculated_review_finding_type'
    );
  },
};
