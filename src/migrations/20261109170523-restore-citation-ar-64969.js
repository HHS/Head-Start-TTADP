const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // 20261104120000-correct-ar-64969 hardcoded the ActivityReportObjective id, which is
      // replaced whenever the objective on this unlocked report changes. Look up the report's
      // live monitoring objectives and their grants from the report id instead, and match the
      // citation on its finding uuid, which is unique and stable across environments.
      // Inserts nothing when the report or citation doesn't exist (e.g. seeded/local databases).
      await queryInterface.sequelize.query(
        `
          WITH targets AS (
            SELECT aro.id aro_id, gr.id grant_id, gr.number grant_number
            FROM "ActivityReportObjectives" aro
            JOIN "Objectives" o
              ON o.id = aro."objectiveId"
              AND o."deletedAt" IS NULL
            JOIN "Goals" g
              ON g.id = o."goalId"
              AND g."deletedAt" IS NULL
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
            -- Review details come from the review the finding was initially delivered in (not later
            -- follow-ups). DISTINCT ON keeps one row per grant should that review_uuid have
            -- multiple DeliveredReviews rows, preferring the earliest delivery.
            SELECT DISTINCT ON (gc."grantId")
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
            JOIN "DeliveredReviews" dr
              ON dr.review_uuid = c.initial_review_uuid
              AND dr."deletedAt" IS NULL
            WHERE c.finding_uuid = '5B1BA4B4-27D6-477D-9ED1-5E05012B13DE'
              AND c.citation = '1302.90(c)(1)(vi)'
              AND gc."grantId" IN (SELECT grant_id FROM targets)
            ORDER BY gc."grantId", dr.report_delivery_date, dr.id
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

  async down() {
    // No-op: up skips rows that already exist, and users may have edited the report's citations
    // since, so there's no reliable way to tell which rows this migration created.
  },
};
