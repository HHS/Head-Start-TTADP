module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('DeliveredReviewCitations', 'calculated_review_finding_type', {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('DeliveredReviewCitations', 'calculated_review_finding_type');
  },
};
