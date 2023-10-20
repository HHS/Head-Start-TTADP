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
      -- Merging goals to a new template
      -- There are some goals that are being merged into goals
      -- that are already on the correct template, and some
      -- goals that need to become the FEI goal

      -- PROCESS:
      -- Create goal_merges listing target goals and templates
      -- Create template_merges listing which templates from donor templates need to merge to target templates
      -- NOTE: currently skipping goal template merge steps because there are no goal templates to merge
      -- Correct any goals that are their own merge target by updating to match their new templates
      -- Create objective_merges for objectives that match on donor and target goals
      -- Update the target objectives record history fields from the donor objectives
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

      -- Update goal templates for fei.
      DROP TABLE IF EXISTS goal_merges;
      CREATE TEMP TABLE goal_merges
      AS
      WITH goalmap AS (
        SELECT -- starting with the 2023 set
          '01CH011564' grnum,
          54340 donor_gid,
          50741 target_gid
        UNION SELECT '01CH011820', 52284, 50952
        UNION SELECT '01CH011820', 52416, 50952
        UNION SELECT '01CH011482', 54341, 52420
        UNION SELECT '01CH011496', 54342, 51164
        UNION SELECT '01CH010695', 54343, 51171
        UNION SELECT '01CH011183', 52285, 50953
        UNION SELECT '01CH010718', 54344, 51165
        UNION SELECT '01CH011941', 52286, 50954
        UNION SELECT '01CH011875', 54345, 51166
        UNION SELECT '01CH011404', 52287, 50955
        UNION SELECT '01CH011404', 54360, 50955
        UNION SELECT '01CH012151', 54351, 54325
        UNION SELECT '01CH010716', 52288, 50956
        UNION SELECT '01CH011664', 52289, 50957
        UNION SELECT '01CH010781', 52290, 50958
        UNION SELECT '01CH010741', 52291, 50959
        UNION SELECT '01CH011513', 54346, 51168
        UNION SELECT '01CH012160', 52292, 50960
        UNION SELECT '01CH011913', 52293, 52223
        UNION SELECT '01CH010930', 52295, 50705
        UNION SELECT '01CH010602', 52296, 50961
        UNION SELECT '01CH011668', 54347, 51169
        UNION SELECT '01CH012124', 54348, 51170
        UNION SELECT '05CH011505', 55653, 55649
        UNION SELECT '05CH010709', 55651, 55648
        UNION SELECT '05CH010775', 52460, 52453
        UNION SELECT '05CH011904', 52461, 52454
        UNION SELECT '05CH012183', 52462, 52455
        UNION SELECT '05CH011796', 55655, 54275
        UNION SELECT '05CH011188', 54308, 54774
        UNION SELECT '05CH010694', 55650, 55647
        UNION SELECT '05CH010926', 52319, 50605
        UNION SELECT '05CH011114', 52318, 50606
        UNION SELECT '05CH011731', 52317, 50607
        UNION SELECT '05CH011253', 52463, 52456
        UNION SELECT '05CH011463', 51508, 52451
        UNION SELECT '05CH011463', 51654, 52451
        UNION SELECT '05CH011463', 54307, 52451
        UNION SELECT '05CH011851', 54316, 55215
        UNION SELECT '05CH011779', 55654, 53116
        UNION SELECT '05CH010568', 54002, 51599
        UNION SELECT '05CH012264', 54767, 56632
        UNION SELECT '05CH011144', 51892, 51811
        UNION SELECT '10CH012116', 53611, 53390
        UNION SELECT '01CH011357', 54349, 54349 -- continuing with the 2093 set
        UNION SELECT '01CH011073', 54350, 54350
        UNION SELECT '01CH011423', 54215, 54215
        UNION SELECT '01CH011874', 52294, 52294
        UNION SELECT '04CH011857', 55635, 55635
        UNION SELECT '04CH011025', 56022, 56022
        UNION SELECT '05CH012028', 55115, 55115
        UNION SELECT '05CH012316', 56047, 56047
        UNION SELECT '05CH011333', 54317, 54317
      ),
      target_template AS (SELECT 19017 fei_gtid),
      existing_fei_goals AS (
        SELECT
          COALESCE(g.id,target_gid) gid,
          target_gid,
          grnum
        FROM goalmap gm
        CROSS JOIN target_template tt
        JOIN "Grants" gr
          ON grnum = gr.number
        LEFT JOIN "Goals" g
          ON g."grantId" = gr.id
          AND g."goalTemplateId" = tt.fei_gtid
      )
      SELECT
        grnum,
        donor_gid,
        target_gid,
        fei_gtid target_gtid
      FROM goalmap
      CROSS JOIN target_template
      ;

      -- This returns empty on the current dataset because none of the
      -- pseudo-FEI goals have templates. This seems wrong, but it is
      -- the state of the data right now.
      DROP TABLE IF EXISTS template_merges;
      CREATE TEMP TABLE template_merges
      AS
      SELECT DISTINCT
        g."goalTemplateId" donor_gtid,
        target_gtid
      FROM goal_merges gm
      JOIN "Goals" g
        ON gm.donor_gid = g.id
      WHERE g."goalTemplateId" IS NOT NULL
      ;

      -- When template_merges is empty, then goal template merging logic
      -- will never be engaged. So, instead of implementing that all now
      -- we can save a lot of time by just confirming that it can be skipped
      -- for now. This will error out the transaction if there are any
      -- goal templates on the donor goals
      WITH template_merges_count AS (SELECT COUNT(*) cnt FROM template_merges)
      SELECT
        1/
        (LEAST(cnt, 1) - 1)
      FROM template_merges_count
      ;


      -- Update pseudo FEI goals to be valid FEI goals
      DROP TABLE IF EXISTS corrected_goals;
      CREATE TEMP TABLE corrected_goals
      AS
      WITH updater AS (
        UPDATE "Goals" AS g
        SET
          name = gt."templateName",
          "goalTemplateId" = gm.target_gtid
        FROM goal_merges gm
        JOIN "GoalTemplates" gt
          ON gm.target_gtid = gt.id
        WHERE donor_gid = target_gid
          AND target_gid = g.id
        RETURNING
          g.id gid,
          donor_gid original_gid
      ) SELECT * FROM updater
      ;

      -- Create objective_merges for objectives that match on donor and target goals
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
        'corrected_goals' operation,
        COUNT(*) cnt
      FROM corrected_goals
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

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
};
