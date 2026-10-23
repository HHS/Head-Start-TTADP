const { prepMigration } = require('../lib/migration');

const auditDescriptor = 'Reset R09-AR-67901 to Draft';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename, auditDescriptor);

      await queryInterface.sequelize.query(
        `
          UPDATE "ActivityReports"
          SET "submissionStatus" = 'draft',
              "calculatedStatus" = 'draft',
              "submittedDate" = null,
              "approvedAt" = null,
              "approvedAtTimezone" = null
          WHERE id = 67901 AND "regionId" = 9;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(
        `
          WITH original AS (
            SELECT audit.old_row_data
            FROM "ZALActivityReports" audit
            JOIN "ZADescriptor" descriptor ON descriptor.id = audit.descriptor_id
            WHERE audit.data_id = 67901
              AND audit.dml_type = 'UPDATE'
              AND descriptor.descriptor = :auditDescriptor
            ORDER BY audit.dml_timestamp DESC
            LIMIT 1
          )
          UPDATE "ActivityReports" report
          SET "submissionStatus" = previous."submissionStatus",
              "calculatedStatus" = previous."calculatedStatus",
              "submittedDate" = previous."submittedDate",
              "approvedAt" = previous."approvedAt",
              "approvedAtTimezone" = previous."approvedAtTimezone"
          FROM original,
               json_populate_record(null::"ActivityReports", original.old_row_data::json) previous
          WHERE report.id = 67901 AND report."regionId" = 9;
        `,
        { replacements: { auditDescriptor }, transaction }
      );
    });
  },
};
