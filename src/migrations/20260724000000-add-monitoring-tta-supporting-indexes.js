const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await Promise.all([
        queryInterface.addIndex('GrantCitations', ['citationId', 'recipient_id', 'region_id'], {
          name: 'grant_citations_citation_id_recipient_id_region_id_idx',
          transaction,
        }),
        queryInterface.addIndex('DeliveredReviewCitations', ['citationId'], {
          name: 'delivered_review_citations_citation_id_idx',
          transaction,
        }),
        queryInterface.addIndex('ActivityReportObjectiveCitations', ['citationId'], {
          name: 'activity_report_objective_citations_citation_id_idx',
          transaction,
        }),
        queryInterface.addIndex('ActivityReportObjectiveCitations', ['grantId', 'citationId'], {
          name: 'activity_report_objective_citations_grant_id_citation_id_idx',
          transaction,
        }),
      ]);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await Promise.all([
        queryInterface.removeIndex(
          'GrantCitations',
          'grant_citations_citation_id_recipient_id_region_id_idx',
          {
            transaction,
          }
        ),
        queryInterface.removeIndex(
          'DeliveredReviewCitations',
          'delivered_review_citations_citation_id_idx',
          {
            transaction,
          }
        ),
        queryInterface.removeIndex(
          'ActivityReportObjectiveCitations',
          'activity_report_objective_citations_citation_id_idx',
          {
            transaction,
          }
        ),
        queryInterface.removeIndex(
          'ActivityReportObjectiveCitations',
          'activity_report_objective_citations_grant_id_citation_id_idx',
          {
            transaction,
          }
        ),
      ]);
    });
  },
};
