module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Citations"
        ADD COLUMN IF NOT EXISTS latest_raw_history_status TEXT;
      ALTER TABLE "DeliveredReviewCitations"
        ADD COLUMN IF NOT EXISTS raw_history_status TEXT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Citations" DROP COLUMN IF EXISTS latest_raw_history_status;
      ALTER TABLE "DeliveredReviewCitations" DROP COLUMN IF EXISTS raw_history_status;
    `);
  },
};
