const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Previously, if grants ended and were replaced between when the review process
      // began and when the report delivery reached TTA Hub, we opened the Monitoring Goal
      // on the replacement grant so it would remain selectable. We've changed logic to
      // keep the Monitoring on the inactive Goal and keep it selectable.

      // This will soft-delete monitoring Goals created on replacement grants that have
      // never had findings of their own, and remove their connections to any ARs.
      await queryInterface.sequelize.query(`
        -- Creating the goal deletion list with all the fields that were used to
        -- validate it.
        DROP TABLE IF EXISTS goals_to_delete;
        CREATE TEMP TABLE goals_to_delete
        AS
        SELECT
          g.id goal_id,
          g."createdAt"::date create_date,
          gr.number grnumber,
          STRING_AGG(DISTINCT mr.name,';') reviews,
          STRING_AGG(DISTINCT mr.outcome,';') outcomes,
          STRING_AGG(DISTINCT ar.id::text,';') ar_ids,
          STRING_AGG(DISTINCT ar."calculatedStatus"::text,';') ar_statuses,
          LEFT(r.name,35) recipient
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        JOIN "Recipients" r
          ON gr."recipientId" = r.id
        LEFT JOIN "MonitoringReviewGrantees" mrg
          ON gr.number = mrg."grantNumber"
          AND mrg."sourceDeletedAt" IS NULL
        LEFT JOIN "MonitoringReviews" mr
          ON mrg."reviewId" = mr."reviewId"
          AND mr."sourceDeletedAt" IS NULL
        LEFT JOIN "MonitoringFindingHistories" mfh
          ON mr."reviewId" = mfh."reviewId"
          AND mfh."sourceDeletedAt" IS NULL
        LEFT JOIN "MonitoringFindings" mf
          ON mfh."findingId" = mf."findingId"
          AND mf."sourceDeletedAt" IS NULL
        LEFT JOIN "ActivityReportGoals" arg
          ON arg."goalId" = g.id
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
          AND ar."calculatedStatus" != 'deleted'
        WHERE g."deletedAt" IS NULL
          AND g."goalTemplateId" = 24872 -- Monitoring Goal Template
        GROUP BY 1,2,3,8
        HAVING BOOL_AND(mf.id IS NULL)
          OR BOOL_AND(mfh.determination IS NULL OR mfh.determination IN ('Abandoned','Withdrawn','Dropped'))
        ORDER BY 5,2
        ;

        DROP TABLE IF EXISTS deleted_args;
        CREATE TEMP TABLE deleted_args
        AS
        WITH updater AS (
        DELETE FROM "ActivityReportGoals" arg
        USING goals_to_delete
        WHERE goal_id = "goalId"
        RETURNING
          goal_id arg_gid,
          id argid
        )
        SELECT
          arg_gid,
          COUNT(DISTINCT argid) del_arg_cnt
        FROM updater
        GROUP BY 1
        ;

        DROP TABLE IF EXISTS detached_objs;
        CREATE TEMP TABLE detached_objs
        AS
        WITH updater AS (
        UPDATE "Objectives" o
        SET "goalId" = NULL
        FROM goals_to_delete
        WHERE "goalId" = goal_id
        RETURNING
          goal_id do_gid,
          id oid
        )
        SELECT
          do_gid,
          COUNT(DISTINCT oid) detached_obj_cnt
        FROM updater
        GROUP BY 1
        ;

        DROP TABLE IF EXISTS deleted_goals;
        CREATE TEMP TABLE deleted_goals
        AS
        WITH updater AS (
        UPDATE "Goals" g
        SET "deletedAt" = NOW()
        FROM goals_to_delete
        WHERE id = goal_id
        RETURNING
          goal_id gid
        )
        SELECT gid
        FROM updater
        ;

        -- Post-run results for easy validation
        SELECT
          goal_id,
          grnumber,
          recipient,
          ar_ids,
          ar_statuses,
          gid IS NOT NULL AS deleted,
          detached_obj_cnt,
          del_arg_cnt
        FROM goals_to_delete
        LEFT JOIN deleted_goals
          ON goal_id = gid
        LEFT JOIN detached_objs
          ON goal_id = do_gid
        LEFT JOIN deleted_args
          ON goal_id = arg_gid
        ;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    // no rollback — restore via audit log if needed
  },
};
