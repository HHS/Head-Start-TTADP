module.exports = {
  async up(queryInterface) {
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
