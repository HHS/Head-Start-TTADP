const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(`
        -- Create a list of Monitorin Goals created since 2026-02-03 that were:
        -- - Linked to a deleted Finding
        -- - Are not linked to an active Finding
        -- - Do not have any active ARs
        -- Then mark these goals as deleted

        DROP TABLE IF EXISTS goals_to_delete;
        CREATE TEMP TABLE goals_to_delete
        AS
        WITH candidate_goals AS (
        -- the list of goals connected to a deleted finding without ARs
        SELECT DISTINCT
          g.id gid,
          gr.number grnumber
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        JOIN "MonitoringReviewGrantees" mrg
          ON gr.number = mrg."grantNumber"
        JOIN "MonitoringFindingGrants" mfg
          ON mrg."granteeId" = mfg."granteeId"
        JOIN "MonitoringFindings" mf
          ON mfg."findingId" = mf."findingId"
        LEFT JOIN "ActivityReportGoals" arg
          ON arg."goalId" = g.id
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
          AND ar."calculatedStatus" != 'deleted'
        WHERE g."createdAt" > '2026-02-03'
          AND g."goalTemplateId" = 24872
          AND mf."sourceDeletedAt" IS NOT NULL
          AND ar.id IS NULL
        ),
        -- Find goal closures so we won't think old AOC Findings
        -- are current active findings
        review_goal_closures AS (
        SELECT DISTINCT ON (mr.id)
          mr.id mrid,
          "performedAt" last_close
        FROM "MonitoringReviews" mr
        JOIN "MonitoringReviewGrantees" mrg
          ON mr."reviewId" = mrg."reviewId"
        JOIN "Grants" gr
          ON gr.number = mrg."grantNumber"
        JOIN "Goals" g
          ON g."grantId" = gr.id
          AND "goalTemplateId" = 24872
        JOIN "GoalStatusChanges" gsc
          ON g.id = gsc."goalId"
          AND "newStatus" = 'Closed'
        ORDER BY mr.id, "performedAt" DESC
        )
        SELECT gid, grnumber FROM candidate_goals
        EXCEPT
        -- Exclude goals that have legitimately Active findings
        -- from the goal closure list
        SELECT gid, grnumber
        FROM candidate_goals
        JOIN "MonitoringReviewGrantees" mrg
          ON grnumber = mrg."grantNumber"
          AND mrg."sourceDeletedAt" IS NULL
        JOIN "MonitoringReviews" mr
          ON mr."reviewId" = mrg."reviewId"
          AND mr."sourceDeletedAt" IS NULL
        LEFT JOIN review_goal_closures
          ON mr.id = mrid
        JOIN "MonitoringFindingHistories" mfh
          ON mr."reviewId" = mfh."reviewId"
          AND mfh."sourceDeletedAt" IS NULL
          AND COALESCE(last_close,'1970-01-01'::timestamp) < "reportDeliveryDate"
        JOIN "MonitoringFindings" mf
          ON mfh."findingId" = mf."findingId"
          AND mf."sourceDeletedAt" IS NULL
        JOIN "MonitoringFindingStatuses" mfs
          ON mf."statusId" = mfs."statusId"
        JOIN "MonitoringReviewStatuses" mrs
          ON mr."statusId" = mrs."statusId"
        WHERE mfs.name IN ('Active','Elevated Deficiency')
          OR mr."reportDeliveryDate" IS NULL
        ;

        -- Mark the erroneous Goals deleted
        UPDATE "Goals"
        SET "deletedAt" = NOW()
        FROM goals_to_delete
        WHERE id = gid
        ;

      `, { transaction });
    });
  },

  async down(queryInterface) {
    // no rollbacks on data changes
  },
};
