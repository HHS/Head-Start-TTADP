const { prepMigration } = require('../lib/migration');

// The canonical view definitions live in updateMonitoringFactTables.ts and are
// recreated nightly. This migration exists solely to make the views available on
// fresh environments and in CI before the nightly pipeline has run.
// If you change what either view returns in a way that affects test behavior,
// copy the updated definitions here in a new migration alongside the change
// in updateMonitoringFactTables.ts.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
        CREATE OR REPLACE VIEW citations_live_values
        AS
        WITH last_ar AS (
        SELECT DISTINCT ON (aroc."citationId")
          aroc."citationId" ar_cid,
          ar."startDate" last_tta,
          ar.id last_ar_id
        FROM "ActivityReportObjectiveCitations" aroc
        JOIN "ActivityReportObjectives" aro
          ON aro.id = aroc."activityReportObjectiveId"
        JOIN "ActivityReports" ar
          ON ar.id = aro."activityReportId"
        WHERE ar."calculatedStatus" = 'approved'
        ORDER BY 1,2 DESC NULLS LAST
        ),
        last_goal AS (
        SELECT DISTINCT ON (gc."citationId")
          gc."citationId" g_cid,
          gsc."performedAt" last_closed_goal,
          g.id last_closed_goal_id
        FROM "GrantCitations" gc
        JOIN "Goals" g
          ON g."grantId" = gc."grantId"
        JOIN "GoalTemplates" gt
          ON g."goalTemplateId" = gt.id
          AND gt.standard = 'Monitoring'
        JOIN "GoalStatusChanges" gsc
          ON gsc."goalId" = g.id AND gsc."newStatus" = 'Closed'
        WHERE g."deletedAt" IS NULL
        ORDER BY 1,2 DESC NULLS LAST
        )
        SELECT
          c.id,
          la.last_tta,
          la.last_ar_id,
          lg.last_closed_goal,
          lg.last_closed_goal_id
        FROM "Citations" c
        LEFT JOIN last_ar la
          ON id = ar_cid
        LEFT JOIN last_goal lg
          ON id = g_cid
        WHERE c."deletedAt" IS NULL
        ;

        CREATE OR REPLACE VIEW deliveredreviews_live_values
        AS
        WITH last_ar AS (
        SELECT DISTINCT ON (drc."deliveredReviewId")
          drc."deliveredReviewId" ar_drid,
          ar."startDate" last_tta,
          ar.id last_ar_id
        FROM "DeliveredReviewCitations" drc
        JOIN "Citations" c
          ON c.id = drc."citationId"
          AND c."deletedAt" IS NULL
        JOIN "ActivityReportObjectiveCitations" aroc
          ON aroc."citationId" = c.id
        JOIN "ActivityReportObjectives" aro
          ON aro.id = aroc."activityReportObjectiveId"
        JOIN "ActivityReports" ar
          ON ar.id = aro."activityReportId"
        WHERE ar."calculatedStatus" = 'approved'
        ORDER BY 1,2 DESC NULLS LAST
        ),
        last_goal AS (
        SELECT DISTINCT ON (gdr."deliveredReviewId")
          gdr."deliveredReviewId" g_drid,
          gsc."performedAt" last_closed_goal,
          g.id last_closed_goal_id
        FROM "GrantDeliveredReviews" gdr
        JOIN "Goals" g
          ON g."grantId" = gdr."grantId"
        JOIN "GoalTemplates" gt
          ON g."goalTemplateId" = gt.id
          AND gt.standard = 'Monitoring'
        JOIN "GoalStatusChanges" gsc
          ON gsc."goalId" = g.id AND gsc."newStatus" = 'Closed'
        WHERE g."deletedAt" IS NULL
        ORDER BY 1,2 DESC NULLS LAST
        )
        SELECT
          dr.id,
          la.last_tta,
          la.last_ar_id,
          lg.last_closed_goal,
          lg.last_closed_goal_id
        FROM "DeliveredReviews" dr
        LEFT JOIN last_ar la
          ON id = ar_drid
        LEFT JOIN last_goal lg
          ON id = g_drid
        WHERE dr."deletedAt" IS NULL
        ;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
        DROP VIEW IF EXISTS citations_live_values;
        DROP VIEW IF EXISTS deliveredreviews_live_values;
      `, { transaction });
    });
  },
};
