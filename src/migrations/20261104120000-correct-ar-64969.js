const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
          INSERT INTO "ActivityReportObjectiveCitations"
            ("activityReportObjectiveId", "citationId", citation, "findingId", "grantId", "grantNumber",
             "reviewName", "standardId", "findingType", "findingSource", acro, severity,
             "reportDeliveryDate", "monitoringFindingStatusName", name, "createdAt", "updatedAt")
          SELECT
            295140, 109138, '1302.90(c)(1)(vi)', '5B1BA4B4-27D6-477D-9ED1-5E05012B13DE', 15618, '04HP000569',
            '267189RAN', 206248, 'Noncompliance', 'Findings Outside the Protocol', 'ANC', 2,
            '2026-04-11', 'Corrected',
            'ANC - 1302.90(c)(1)(vi) - Findings Outside the Protocol', NOW(), NOW()
          -- Skip when the target rows don't exist (e.g. seeded/local databases)
          WHERE EXISTS (SELECT 1 FROM "ActivityReportObjectives" WHERE id = 295140)
            AND EXISTS (SELECT 1 FROM "Citations" WHERE id = 109138)
            AND NOT EXISTS (
              SELECT 1 FROM "ActivityReportObjectiveCitations"
              WHERE "activityReportObjectiveId" = 295140 AND "citationId" = 109138
            );
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
          DELETE FROM "ActivityReportObjectiveCitations"
          WHERE "activityReportObjectiveId" = 295140 AND "citationId" = 109138;
        `,
        { transaction }
      );
    });
  },
};
