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
            293776, 1250, '1302.90(c)(1)(ii)', '8E85AE0E-C6C3-4FDE-A829-C6BCCFAFE5AC', 16292, '10CH013296',
            '260344RAN', 206040, 'Deficiency', 'Significant Health and Safety Incidents', 'DEF', 1,
            '2026-02-12T05:00:00+00:00', 'Active',
            'DEF - 1302.90(c)(1)(ii) - Significant Health and Safety Incidents', NOW(), NOW()
          -- Skip when the target rows don't exist (e.g. seeded/local databases)
          WHERE EXISTS (SELECT 1 FROM "ActivityReportObjectives" WHERE id = 293776)
            AND EXISTS (SELECT 1 FROM "Citations" WHERE id = 1250)
            AND NOT EXISTS (
              SELECT 1 FROM "ActivityReportObjectiveCitations"
              WHERE "activityReportObjectiveId" = 293776 AND "citationId" = 1250
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
          WHERE "activityReportObjectiveId" = 293776 AND "citationId" = 1250;
        `,
        { transaction }
      );
    });
  },
};
