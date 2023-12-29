const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
      -- Some goals created from a curated template have been requested to be changed or merged to regular goals

      -- PROCESS:
      -- Rename false FEI goals
      -- Remove their root causes in GoalFieldResponses
      ------ merge 51671 to 40495: (most of this will probably be empty)
      -- Delete root causes
      -- Merge objective topics
      -- Merge objective resources
      -- Merge objective files
      -- Delete duplicate objective topics
      -- Delete duplicate objective resources
      -- Delete duplicate objective files
      -- Relink non-goalmerge Objectives
      -- Update the target goals record history fields from the donor goals
      -- Relink non-duplicate ARGs
      -- Delete duplicate ARGs
      -- Delete donor goals

      DROP TABLE IF EXISTS goals_for_renaming;
      CREATE TEMP TABLE goals_for_renaming
      AS
      SELECT * FROM (
        VALUES -- sorted and deduped
        (50862, 'The recipient will analyze work force shortages to understand impact on full enrollment.'),
        (54049, 'The recipient will explore root causes of underenrollment and develop strategies to address root causes and share concerns with governing body.'),
        (54097, 'The recipient will explore root causes of underenrollment and develop strategies to address root causes.'),
        (55400, 'The recipient will explore root causes of underenrollment and develop strategies to address root causes.'),
        (55765, 'The recipient will explore root causes of underenrollment and develop strategies to address root causes.'),
        (56179, 'The recipient will explore root causes of underenrollment and develop strategies to address root causes.')
      ) AS data(gid, newtext)
      ;

      UPDATE "Goals"
      SET
        name = newtext,
        "goalTemplateId" = NULL,
        "updatedAt" = NOW()
      FROM goals_for_renaming
      WHERE id = gid
      ;

      DELETE FROM "GoalFieldResponses"
      USING goals_for_renaming
      WHERE "goalId" = gid
      ;

      DROP TABLE IF EXISTS goal_merges;
      CREATE TEMP TABLE goal_merges
      AS
      SELECT
        51671 donor_gid,
        40495 target_gid
      ;

      DROP TABLE IF EXISTS deleted_gfrs;
      CREATE TEMP TABLE deleted_gfrs
      AS
      WITH updater AS (
        DELETE FROM "GoalFieldResponses"
        USING goal_merges
        WHERE "goalId" = donor_gid
        RETURNING
          id gfrid,
          donor_gid
      ) SELECT * FROM updater
      ;

      DROP TABLE IF EXISTS objective_merges;
      CREATE TEMP TABLE objective_merges
      AS
      SELECT
        donor_obj.id donor_oid,
        target_obj.id target_oid
      FROM goal_merges gm
      JOIN "Objectives" donor_obj
        ON gm.donor_gid = donor_obj."goalId"
      JOIN "Objectives" target_obj
        ON gm.target_gid = target_obj."goalId"
        AND donor_obj.title = target_obj.title
      WHERE donor_obj.id != target_obj.id
      ;

      -- Update the merge target objectives
      DROP TABLE IF EXISTS updated_target_objectives;
      CREATE TEMP TABLE updated_target_objectives
      AS
      WITH updater AS (
        UPDATE "Objectives" AS o
        SET
          "updatedAt" = GREATEST(d_o."updatedAt", o."updatedAt"),
          "firstNotStartedAt" = LEAST(d_o."firstNotStartedAt", o."firstNotStartedAt"),
          "lastNotStartedAt" = GREATEST(d_o."lastNotStartedAt", o."lastNotStartedAt"),
          "firstInProgressAt" = LEAST(d_o."firstInProgressAt", o."firstInProgressAt"),
          "lastInProgressAt" = GREATEST(d_o."lastInProgressAt", o."lastInProgressAt"),
          "firstSuspendedAt" = LEAST(d_o."firstSuspendedAt", o."firstSuspendedAt"),
          "lastSuspendedAt" = GREATEST(d_o."lastSuspendedAt", o."lastSuspendedAt"),
          "firstCompleteAt" = LEAST(d_o."firstCompleteAt", o."firstCompleteAt"),
          "lastCompleteAt" = GREATEST(d_o."lastCompleteAt", o."lastCompleteAt")
        FROM objective_merges om
        JOIN "Objectives" d_o
          ON om.donor_oid = d_o.id
        WHERE om.target_oid = o.id
        RETURNING
          o.id oid,
          donor_oid
      ) SELECT * FROM updater
      ;

      
      -- Merge objective topics
      DROP TABLE IF EXISTS relinked_objective_topics;
      CREATE TEMP TABLE relinked_objective_topics
      AS
      WITH updater AS (
        WITH unmatched AS (
          SELECT
            donor_oid,
            "topicId" tid
          FROM objective_merges om
          JOIN "ObjectiveTopics" ot
            ON om.donor_oid = ot."objectiveId"
          EXCEPT
          SELECT
            donor_oid,
            "topicId"
          FROM objective_merges om
          JOIN "ObjectiveTopics" ot
            ON om.target_oid = ot."objectiveId"
        )
        UPDATE "ObjectiveTopics" AS ot
        SET "objectiveId" = target_oid
        FROM objective_merges om
        JOIN unmatched u
          ON u.donor_oid = om.donor_oid
        WHERE ot."topicId" = u.tid
          AND ot."objectiveId" = u.donor_oid
        RETURNING
          id otid,
          om.donor_oid original_oid
      ) SELECT * FROM updater
      ;

      -- Merge objective resources
      DROP TABLE IF EXISTS relinked_objective_resources;
      CREATE TEMP TABLE relinked_objective_resources
      AS
      WITH updater AS (
        WITH unmatched AS (
          SELECT
            donor_oid,
            "resourceId" rid
          FROM objective_merges om
          JOIN "ObjectiveResources" o_r
            ON om.donor_oid = o_r."objectiveId"
          EXCEPT
          SELECT
            donor_oid,
            "resourceId"
          FROM objective_merges om
          JOIN "ObjectiveResources" o_r
            ON om.target_oid = o_r."objectiveId"
        )
        UPDATE "ObjectiveResources" AS o_r
        SET "objectiveId" = target_oid
        FROM objective_merges om
        JOIN unmatched u
          ON u.donor_oid = om.donor_oid
        WHERE o_r."resourceId" = u.rid
          AND o_r."objectiveId" = u.donor_oid
        RETURNING
          id orid,
          om.donor_oid original_oid
      ) SELECT * FROM updater
      ;
      -- Merge objective files
      DROP TABLE IF EXISTS relinked_objective_files;
      CREATE TEMP TABLE relinked_objective_files
      AS
      WITH updater AS (
        WITH unmatched AS (
          SELECT
            donor_oid,
            "fileId" fid
          FROM objective_merges om
          JOIN "ObjectiveFiles" of
            ON om.donor_oid = of."objectiveId"
          EXCEPT
          SELECT
            donor_oid,
            "fileId"
          FROM objective_merges om
          JOIN "ObjectiveFiles" of
            ON om.target_oid = of."objectiveId"
        )
        UPDATE "ObjectiveFiles" AS of
        SET "objectiveId" = target_oid
        FROM objective_merges om
        JOIN unmatched u
          ON u.donor_oid = om.donor_oid
        WHERE of."fileId" = u.fid
          AND of."objectiveId" = u.donor_oid
        RETURNING
          id ofid,
          om.donor_oid original_oid
      ) SELECT * FROM updater
      ;
      -- Delete duplicate objective topics
      DROP TABLE IF EXISTS deleted_objective_topics;
      CREATE TEMP TABLE deleted_objective_topics
      AS
      WITH updater AS (
        DELETE FROM "ObjectiveTopics"
        USING objective_merges
        WHERE "objectiveId" = donor_oid
        RETURNING
          id otid,
          donor_oid
      ) SELECT * FROM updater
      ;
      -- Delete duplicate objective resources
      DROP TABLE IF EXISTS deleted_objective_resources;
      CREATE TEMP TABLE deleted_objective_resources
      AS
      WITH updater AS (
        DELETE FROM "ObjectiveResources"
        USING objective_merges
        WHERE "objectiveId" = donor_oid
        RETURNING
          id orid,
          donor_oid
      ) SELECT * FROM updater
      ;
      -- Delete duplicate objective files
      CREATE TEMP TABLE deleted_objective_files
      AS
      WITH updater AS (
        DELETE FROM "ObjectiveFiles"
        USING objective_merges
        WHERE "objectiveId" = donor_oid
        RETURNING
          id ofid,
          donor_oid
      ) SELECT * FROM updater
      ;

      -- Link objectives on merged goals to the FEI goals
      DROP TABLE IF EXISTS relinked_objectives;
      CREATE TEMP TABLE relinked_objectives
      AS
      WITH updater AS (
        UPDATE "Objectives"
        SET "goalId" = target_gid
        FROM goal_merges
        WHERE "goalId" = donor_gid
          AND donor_gid != target_gid
        RETURNING
          id oid,
          donor_gid original_gid
      ) SELECT * FROM updater
      ;

      -- Update the merge target goals
      DROP TABLE IF EXISTS updated_target_goals;
      CREATE TEMP TABLE updated_target_goals
      AS
      WITH updater AS (
        UPDATE "Goals" AS g
        SET
          "updatedAt" = GREATEST(dg."updatedAt", g."updatedAt"),
          "firstNotStartedAt" = LEAST(dg."firstNotStartedAt", g."firstNotStartedAt"),
          "lastNotStartedAt" = GREATEST(dg."lastNotStartedAt", g."lastNotStartedAt"),
          "firstInProgressAt" = LEAST(dg."firstInProgressAt", g."firstInProgressAt"),
          "lastInProgressAt" = GREATEST(dg."lastInProgressAt", g."lastInProgressAt"),
          "firstCeasedSuspendedAt" = LEAST(dg."firstCeasedSuspendedAt", g."firstCeasedSuspendedAt"),
          "lastCeasedSuspendedAt" = GREATEST(dg."lastCeasedSuspendedAt", g."lastCeasedSuspendedAt"),
          "firstClosedAt" = LEAST(dg."firstClosedAt", g."firstClosedAt"),
          "lastClosedAt" = GREATEST(dg."lastClosedAt", g."lastClosedAt")
        FROM goal_merges gm
        JOIN "Goals" dg
          ON gm.donor_gid = dg.id
        WHERE gm.target_gid = g.id
        RETURNING
          g.id gid,
          donor_gid
      ) SELECT * FROM updater
      ;

      -- relink non-duplicate ARGs
      DROP TABLE IF EXISTS relinked_args;
      CREATE TEMP TABLE relinked_args
      AS
      WITH updater AS (
        WITH unmatched AS (
          SELECT
            "activityReportId" arid,
            "goalId" gid
          FROM goal_merges gm
          JOIN "ActivityReportGoals" arg
            ON gm.donor_gid = arg."goalId"
          EXCEPT
          SELECT
            "activityReportId",
            "goalId"
          FROM goal_merges gm
          JOIN "ActivityReportGoals" arg
            ON gm.target_gid = arg."goalId"
        )
        UPDATE "ActivityReportGoals" AS arg
        SET "goalId" = target_gid
        FROM goal_merges gm
        JOIN unmatched u
          ON u.gid = gm.donor_gid
        WHERE arg."goalId" = u.gid
          AND arg."activityReportId" = u.arid
        RETURNING
          id argid,
          gm.donor_gid original_gid
      ) SELECT * FROM updater
      ;
      -- Delete duplicate ARGs
      DROP TABLE IF EXISTS deleted_args;
      CREATE TEMP TABLE deleted_args
      AS
      WITH updater AS (
        DELETE FROM "ActivityReportGoals"
        USING goal_merges
        WHERE "goalId" = donor_gid
        RETURNING
          id argid,
          donor_gid
      ) SELECT * FROM updater
      ;

      -- Delete donor goals
      DROP TABLE IF EXISTS deleted_goals;
      CREATE TEMP TABLE deleted_goals
      AS
      WITH updater AS (
        DELETE FROM "Goals"
        USING goal_merges
        WHERE id = donor_gid
          AND donor_gid != target_gid
        RETURNING
          target_gid,
          donor_gid
      ) SELECT * FROM updater
      ;

      SELECT
        1 op_order,
        'deleted_gfrs' operation,
        COUNT(*) cnt
      FROM deleted_gfrs
      UNION SELECT 2,'updated_target_objectives', COUNT(*) FROM updated_target_objectives
      UNION SELECT 3,'relinked_objective_topics', COUNT(*) FROM relinked_objective_topics
      UNION SELECT 4,'relinked_objective_resources', COUNT(*) FROM relinked_objective_resources
      UNION SELECT 5,'relinked_objective_files', COUNT(*) FROM relinked_objective_files
      UNION SELECT 6,'deleted_objective_topics', COUNT(*) FROM deleted_objective_topics
      UNION SELECT 7,'deleted_objective_resources', COUNT(*) FROM deleted_objective_resources
      UNION SELECT 8,'deleted_objective_files', COUNT(*) FROM deleted_objective_files
      UNION SELECT 9,'relinked_objectives', COUNT(*) FROM relinked_objectives
      UNION SELECT 10,'updated_target_goals', COUNT(*) FROM updated_target_goals
      UNION SELECT 11,'relinked_args', COUNT(*) FROM relinked_args
      UNION SELECT 12,'deleted_args', COUNT(*) FROM deleted_args
      UNION SELECT 13,'deleted_goals', COUNT(*) FROM deleted_goals
      ORDER BY 1
      ;

      
      `, { transaction });
    });
  },
  async down() {
    // rolling back merges and deletes would be a mess
  },
};
