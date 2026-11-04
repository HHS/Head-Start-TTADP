const { prepMigration } = require('../lib/migration');

const auditDescriptor = 'Add closed citation 1302.90(c)(1)(vi) to R04-AR-64969';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename, auditDescriptor);

      // The citation is closed, so it can't be selected on the unlocked report.
      // Attach it to the report's monitoring objectives for the report's own grants.
      // Inserts nothing when the target rows don't exist (e.g. seeded/local databases).
      await queryInterface.sequelize.query(
        `
          WITH monitoring_template AS (
            SELECT id
            FROM "GoalTemplates"
            WHERE standard = 'Monitoring' AND "deletedAt" IS NULL
          ),
          targets AS (
            SELECT aro.id aro_id, gr.id grant_id, gr.number grant_number
            FROM "ActivityReportObjectives" aro
            JOIN "ActivityReports" ar
              ON ar.id = aro."activityReportId"
              AND ar."regionId" = 4
            JOIN "Objectives" o ON o.id = aro."objectiveId"
            JOIN "Goals" g
              ON g.id = o."goalId"
              AND g."goalTemplateId" IN (SELECT id FROM monitoring_template)
            JOIN "Grants" gr ON gr.id = g."grantId"
            WHERE aro."activityReportId" = 64969
          ),
          cit AS (
            SELECT DISTINCT ON (gc."grantId", c.id)
              gc."grantId" grant_id,
              c.id citation_id,
              c.citation,
              c.finding_uuid,
              c.standard_id,
              c.calculated_finding_type,
              c.calculated_category,
              c.raw_status,
              dr.review_name,
              dr.report_delivery_date,
              CASE
                WHEN c.calculated_finding_type = 'Deficiency' THEN 'DEF'
                WHEN c.calculated_finding_type = 'Noncompliance' THEN 'ANC'
                ELSE 'AOC'
              END acro,
              CASE
                WHEN c.calculated_finding_type = 'Deficiency' THEN 1
                WHEN c.calculated_finding_type = 'Noncompliance' THEN 2
                ELSE 3
              END severity
            FROM "GrantCitations" gc
            JOIN "Citations" c
              ON c.id = gc."citationId"
              AND c."deletedAt" IS NULL
            JOIN "DeliveredReviewCitations" drc ON drc."citationId" = c.id
            JOIN "GrantDeliveredReviews" gdr
              ON gdr."deliveredReviewId" = drc."deliveredReviewId"
              AND gdr."grantId" = gc."grantId"
            JOIN "DeliveredReviews" dr
              ON dr.id = drc."deliveredReviewId"
              AND dr."deletedAt" IS NULL
            WHERE c.citation = '1302.90(c)(1)(vi)'
              AND gc."grantId" IN (SELECT grant_id FROM targets)
            ORDER BY gc."grantId", c.id, dr.report_delivery_date DESC
          )
          INSERT INTO "ActivityReportObjectiveCitations"
            ("activityReportObjectiveId", "citationId", citation, "findingId", "grantId", "grantNumber",
             "reviewName", "standardId", "findingType", "findingSource", acro, severity,
             "reportDeliveryDate", "monitoringFindingStatusName", name, "createdAt", "updatedAt")
          SELECT
            t.aro_id, cit.citation_id, cit.citation, cit.finding_uuid, t.grant_id, t.grant_number,
            cit.review_name, cit.standard_id, cit.calculated_finding_type, cit.calculated_category,
            cit.acro, cit.severity, cit.report_delivery_date, cit.raw_status,
            CONCAT_WS(' - ', cit.acro, cit.citation, NULLIF(TRIM(cit.calculated_category), '')),
            NOW(), NOW()
          FROM targets t
          JOIN cit ON cit.grant_id = t.grant_id
          WHERE NOT EXISTS (
            SELECT 1 FROM "ActivityReportObjectiveCitations" existing
            WHERE existing."activityReportObjectiveId" = t.aro_id
              AND existing."citationId" = cit.citation_id
          );
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
          DELETE FROM "ActivityReportObjectiveCitations"
          WHERE citation = '1302.90(c)(1)(vi)'
            AND "activityReportObjectiveId" IN (
              SELECT id FROM "ActivityReportObjectives" WHERE "activityReportId" = 64969
            );
        `,
        { transaction }
      );
    });
  },
};
