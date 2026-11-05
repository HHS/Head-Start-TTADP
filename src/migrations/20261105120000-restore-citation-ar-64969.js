const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // 20261104120000-correct-ar-64969 hardcoded the ActivityReportObjective id, which is
      // replaced whenever the objective on this unlocked report changes. Look up the report's
      // monitoring objectives, their grants and the citation from the report id instead.
      // Inserts nothing when the report or citation doesn't exist (e.g. seeded/local databases).
      await queryInterface.sequelize.query(
        `
          WITH targets AS (
            SELECT aro.id aro_id, gr.id grant_id, gr.number grant_number
            FROM "ActivityReportObjectives" aro
            JOIN "Objectives" o ON o.id = aro."objectiveId"
            JOIN "Goals" g ON g.id = o."goalId"
            JOIN "GoalTemplates" gt
              ON gt.id = g."goalTemplateId"
              AND gt.standard = 'Monitoring'
            JOIN "ActivityRecipients" ar
              ON ar."activityReportId" = aro."activityReportId"
              AND ar."grantId" = g."grantId"
            JOIN "Grants" gr ON gr.id = g."grantId"
            WHERE aro."activityReportId" = 64969
          ),
          cit AS (
            -- Use the review the finding was originally delivered in, not later follow-ups
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
            ORDER BY gc."grantId", c.id, dr.report_delivery_date ASC
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
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

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
