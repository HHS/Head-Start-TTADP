const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
      --  1. Identify the affected reports/grants/goals
      DROP TABLE IF EXISTS tmp_affected_reports_grants_goals;
      CREATE TEMP TABLE tmp_affected_reports_grants_goals
      AS
      SELECT
        arg."activityReportId",
        r.name "Recipeint",
        gr.id "grantId",
        gr."number",
        array_agg(DISTINCT g.id ORDER BY g.id) "goalIds",
        min(arg."createdAt") "earliest createdAt",
        g.name
      FROM "ActivityReportGoals" arg
      JOIN "Goals" g
      ON arg."goalId" = g.id
      JOIN "Grants" gr
      on g."grantId" = gr.id
      JOIN "Recipients" r
      ON gr."recipientId" = r.id
      GROUP BY 1,2,3,4,7
      HAVING COUNT(DISTINCT g.id) > 1
      AND COUNT(DISTINCT g.id) != COUNT(DISTINCT g.name)
      ORDER BY 1 desc,2,3;
      --  2. Identify the affected objectives
      DROP TABLE IF EXISTS tmp_affected_objectives;
      CREATE TEMP TABLE tmp_affected_objectives
      AS
      SELECT
        targg."activityReportId",
        targg."grantId",
        targg."goalIds"[1] "originalGoalId",
        targg."goalIds"[2] "extraGoalId",
        array_remove(array_agg(DISTINCT aro."objectiveId" ORDER BY aro."objectiveId") filter (where o."goalId" = targg."goalIds"[1]),null) "originalGoalObjectiveIds",
        array_remove(array_agg(DISTINCT aro."objectiveId" ORDER BY aro."objectiveId") filter (where o."goalId" = targg."goalIds"[2]),null) "extraGoalObjectiveIds",
        aro.title
      FROM tmp_affected_reports_grants_goals targg
      LEFT JOIN "Objectives" o
      ON o."goalId" = any(targg."goalIds")
      left join "ActivityReportObjectives" aro
      ON o.id = aro."objectiveId"
      AND targg."activityReportId" = aro."activityReportId"
      group by 1,2,3,4,7
      having aro.title is not null;
      --  3. create missing objectives on original goals
      DROP TABLE IF EXISTS tmp_created_missing_objectives;
      CREATE TEMP TABLE tmp_created_missing_objectives AS
      WITH created_missing_objectives AS (
          INSERT INTO "Objectives" (
              "goalId",
              title,
              status,
              "createdAt",
              "updatedAt",
              "objectiveTemplateId",
              "onApprovedAR",
              "rtrOrder",
              "createdVia",
              "onAR",
              "closeSuspendReason",
              "closeSuspendContext",
              "supportType"
          )
          SELECT
              tao."originalGoalId" AS "goalId",
              o.title,
              (ARRAY_AGG(DISTINCT o.status))[1] AS "status",
              MIN(o."createdAt") AS "createdAt",
              MAX(o."updatedAt") AS "updatedAt",
              o."objectiveTemplateId",
              bool_or(o."onApprovedAR"),
              MIN(o."rtrOrder") AS "rtrOrder",
              (ARRAY_AGG(DISTINCT o."createdVia"))[1] AS "createdVia",
              bool_or(o."onAR"),
              (ARRAY_AGG(DISTINCT o."closeSuspendReason"))[1] AS "closeSuspendReason",
              (ARRAY_AGG(DISTINCT o."closeSuspendContext"))[1] AS "closeSuspendContext",
              (ARRAY_AGG(DISTINCT o."supportType"))[1] AS "supportType"
          FROM "Objectives" o
          JOIN tmp_affected_objectives tao ON o.id = ANY(tao."extraGoalObjectiveIds")
          WHERE "originalGoalObjectiveIds" IS NULL
          GROUP BY 1, 2, 6
          RETURNING
            id,
            "goalId",
            title,
            status,
            "createdAt",
            "updatedAt",
            "objectiveTemplateId",
            "onApprovedAR",
            "rtrOrder",
            "createdVia",
            "onAR",
            "closeSuspendReason",
            "closeSuspendContext",
            "supportType"
      )
      SELECT
          tao."activityReportId",
          tao."grantId",
          cmo."goalId",
          cmo.id AS "objectiveId",
          cmo.title,
          cmo.status,
          cmo."createdAt",
          cmo."updatedAt",
          cmo."objectiveTemplateId",
          cmo."onApprovedAR",
          cmo."rtrOrder",
          cmo."createdVia",
          cmo."onAR",
          cmo."closeSuspendReason",
          cmo."closeSuspendContext",
          cmo."supportType"
      FROM created_missing_objectives cmo
      JOIN tmp_affected_objectives tao ON cmo."goalId" = tao."originalGoalId"
      AND cmo.title = tao.title;
      --  4. add new objectives to reports
      DROP TABLE IF EXISTS tmp_missing_objectives_added_to_reports;
      CREATE TEMP TABLE tmp_missing_objectives_added_to_reports
      AS
      WITH missing_objectives_added_to_reports AS (
        INSERT INTO "ActivityReportObjectives"
        (
          "activityReportId",
          "objectiveId",
          "createdAt",
          "updatedAt",
          "ttaProvided",
          "title",
          "status",
          "arOrder",
          "closeSuspendReason",
          "closeSuspendContext",
          "supportType"
        )
        SELECT
          tcmo."activityReportId",
          tcmo."objectiveId",
          MIN(aro."createdAt") "createdAt",
          MAX(aro."updatedAt") "updatedAt",
          (ARRAY_AGG(DISTINCT aro."ttaProvided"))[1] "ttaProvided",
          o.title,
          (ARRAY_AGG(DISTINCT aro.status))[1] "status",
          MIN(aro."arOrder") "arOrder",
          (ARRAY_AGG(DISTINCT aro."closeSuspendReason"))[1] "closeSuspendReason",
          (ARRAY_AGG(DISTINCT aro."closeSuspendContext"))[1] "closeSuspendContext",
          (ARRAY_AGG(DISTINCT aro."supportType"))[1] "supportType"
        FROM tmp_created_missing_objectives tcmo
        JOIN "Objectives" o
        ON tcmo."objectiveId" = o.id
        JOIN tmp_affected_objectives tao
        ON tcmo."activityReportId" = tao."activityReportId"
        AND tcmo."grantId" = tao."grantId"
        AND tcmo."goalId" = tao."originalGoalId"
        JOIN "ActivityReportObjectives" aro
        ON tcmo."activityReportId" = aro."activityReportId"
        AND aro."objectiveId" = ANY(tao."extraGoalObjectiveIds")
        GROUP BY 1,2,6
        RETURNING
          id,
          "activityReportId",
          "objectiveId",
          title
      )
      SELECT
        moatr."activityReportId",
        moatr."objectiveId",
        moatr.title
      FROM missing_objectives_added_to_reports moatr;
      --  4. Identify the affected objectives
      DROP TABLE IF EXISTS tmp_affected_objectives;
      CREATE TEMP TABLE tmp_affected_objectives
      AS
      SELECT
        x."activityReportId",
        x."grantId",
        x."goalIds"[1] "originalGoalId",
        x."goalIds"[2] "extraGoalId",
        array_remove(array_agg(DISTINCT aro."objectiveId" ORDER BY aro."objectiveId") filter (where o."goalId" = x."goalIds"[1]),null) "originalGoalObjectiveIds",
        array_remove(array_agg(DISTINCT aro."objectiveId" ORDER BY aro."objectiveId") filter (where o."goalId" = x."goalIds"[2]),null) "extraGoalObjectiveIds",
        aro.title
      FROM tmp_affected_reports_grants_goals targg
      LEFT JOIN "Objectives" o
      ON o."goalId" = any(targg."goalIds")
      left join "ActivityReportObjectives" aro
      ON o.id = aro."objectiveId"
      AND targg."activityReportId" = aro."activityReportId"
      group by 1,2,3,4,7
      having aro.title is not null;
      --  5. Sync courses from extra activity report objectives to main objective
      DROP TABLE IF EXISTS tmp_sync_courses_across_affected_objectives;
      CREATE TEMP TABLE tmp_sync_courses_across_affected_objectives
      AS
      WITH sync_courses_across_affected_objectives AS (
        INSERT INTO "ActivityReportObjectiveCourses"
        (
          "activityReportObjectiveId",
          "courseId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aro.id "activityReportObjectiveId",
          aroc_e."courseId" "courseId",
          MIN(aroc_e."createdAt") "createdAt",
          MAX(aroc_e."updatedAt") "updatedAt"
        FROM tmp_affected_objectives tao
        JOIN "ActivityReportObjectives" aro
        ON tao."activityReportId" = aro."activityReportId"
        AND tao."originalGoalObjectiveIds"[1] = aro."objectiveId"
        JOIN (
          SELECT
            aroc.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveCourses" aroc
          JOIN "ActivityReportObjectives" aro
          ON aroc."activityReportObjectiveId" = aro.id
        ) aroc_e
        ON aroc_e."objectiveId" = any(tao."extraGoalObjectiveIds")
        OR (aroc_e."objectiveId" = any(tao."originalGoalObjectiveIds")
          AND aroc_e."objectiveId" != tao."originalGoalObjectiveIds"[1])
        LEFT JOIN (
          SELECT
            aroc.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveCourses" aroc
          JOIN "ActivityReportObjectives" aro
          ON aroc."activityReportObjectiveId" = aro.id
        ) aroc_o
        ON aroc_o."objectiveId" = tao."originalGoalObjectiveIds"[1]
        AND aroc_e."courseId" = aroc_o."courseId"
        WHERE aroc_o.id is null
        GROUP BY 1,2
        RETURNING
          id,
          "activityReportObjectiveId",
          "courseId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        scafo."activityReportObjectiveId",
        scafo."courseId",
        scafo."createdAt",
        scafo."updatedAt"
      FROM sync_courses_across_affected_objectives scafo;
      --  6. Sync corses into the objective
      DROP TABLE IF EXISTS tmp_sync_course_to_objectives;
      CREATE TEMP TABLE tmp_sync_course_to_objectives
      AS
      WITH sync_course_to_objectives AS (
        INSERT INTO "ObjectiveCourses" 
        (
          "objectiveId",
          "courseId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aro."objectiveId" "objectiveId",
        tscao."courseId",
        MIN(tscao."createdAt") "createdAt",
        MAX(tscao."updatedAt") "updatedAt"
        FROM tmp_sync_courses_across_affected_objectives tscao
        JOIN "ActivityReportObjectives" aro
        ON tscao."activityReportObjectiveId" = aro.id
        LEFT JOIN "ObjectiveCourses" oc
        ON tscao."courseId" = oc."courseId"
        AND aro."objectiveId" = oc."objectiveId"
        WHERE oc.id IS NULL
        GROUP BY 1,2
        RETURNING
          id,
        "objectiveId",
        "courseId",
        "createdAt",
        "updatedAt"
      )
      SELECT
        scto."objectiveId",
        scto."courseId",
        scto."createdAt",
        scto."updatedAt"
      FROM sync_course_to_objectives scto;
      --  7. Sync files from extra activity report objectives to main objective
      DROP TABLE IF EXISTS tmp_sync_files_across_affected_objectives;
      CREATE TEMP TABLE tmp_sync_files_across_affected_objectives
      AS
      WITH sync_files_across_affected_objectives AS (
        INSERT INTO "ActivityReportObjectiveFiles"
        (
          "activityReportObjectiveId",
          "fileId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aro.id "activityReportObjectiveId",
          arof_e."fileId" "fileId",
          MIN(arof_e."createdAt") "createdAt",
          MAX(arof_e."updatedAt") "updatedAt"
        FROM tmp_affected_objectives tao
        JOIN "ActivityReportObjectives" aro
        ON tao."activityReportId" = aro."activityReportId"
        AND tao."originalGoalObjectiveIds"[1] = aro."objectiveId"
        JOIN (
          SELECT
            arof.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveFiles" arof
          JOIN "ActivityReportObjectives" aro
          ON arof."activityReportObjectiveId" = aro.id
        ) arof_e
        ON arof_e."objectiveId" = any(tao."extraGoalObjectiveIds")
        OR (arof_e."objectiveId" = any(tao."originalGoalObjectiveIds")
          AND arof_e."objectiveId" != tao."originalGoalObjectiveIds"[1])
        LEFT JOIN (
          SELECT
            arof.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveFiles" arof
          JOIN "ActivityReportObjectives" aro
          ON arof."activityReportObjectiveId" = aro.id
        ) arof_o
        ON arof_o."objectiveId" = tao."originalGoalObjectiveIds"[1]
        AND arof_e."fileId" = arof_o."fileId"
        WHERE arof_o.id is null
        GROUP BY 1,2
        RETURNING
          id,
          "activityReportObjectiveId",
          "fileId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        sfafo."activityReportObjectiveId",
        sfafo."fileId",
        sfafo."createdAt",
        sfafo."updatedAt"
      FROM sync_files_across_affected_objectives sfafo;
      --  8. Sync files into the objective
      DROP TABLE IF EXISTS tmp_sync_file_to_objectives;
      CREATE TEMP TABLE tmp_sync_file_to_objectives
      AS
      WITH sync_file_to_objectives AS (
        INSERT INTO "ObjectiveFiles" 
        (
          "objectiveId",
          "fileId",
        "createdAt",
        "updatedAt"
        )
        SELECT
          aro."objectiveId" "objectiveId",
          tsfao."fileId",
          MIN(tsfao."createdAt") "createdAt",
          MAX(tsfao."updatedAt") "updatedAt"
        FROM tmp_sync_files_across_affected_objectives tsfao
        JOIN "ActivityReportObjectives" aro
        ON tsfao."activityReportObjectiveId" = aro.id
        LEFT JOIN "ObjectiveFiles" fo
        ON tsfao."fileId" = fo."fileId"
        AND aro."objectiveId" = fo."objectiveId"
        WHERE fo.id IS NULL
        GROUP BY 1,2
        RETURNING
          id,
          "objectiveId",
          "fileId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        sfto."objectiveId",
        sfto."fileId",
        sfto."createdAt",
        sfto."updatedAt"
      FROM sync_file_to_objectives sfto;
      --  9. Sync resources from extra activity report objectives to main objective
      DROP TABLE IF EXISTS tmp_sync_resources_across_affected_objectives;
      CREATE TEMP TABLE tmp_sync_resources_across_affected_objectives
      AS
      WITH sync_resources_across_affected_objectives AS (
        INSERT INTO "ActivityReportObjectiveResources"
        (
          "activityReportObjectiveId",
          "resourceId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aro.id "activityReportObjectiveId",
          aror_e."resourceId" "resourceId",
          MIN(aror_e."createdAt") "createdAt",
          MAX(aror_e."updatedAt") "updatedAt"
        FROM tmp_affected_objectives tao
        JOIN "ActivityReportObjectives" aro
        ON tao."activityReportId" = aro."activityReportId"
        AND tao."originalGoalObjectiveIds"[1] = aro."objectiveId"
        JOIN (
          SELECT
            aror.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveResources" aror
          JOIN "ActivityReportObjectives" aro
          ON aror."activityReportObjectiveId" = aro.id
        ) aror_e
        ON aror_e."objectiveId" = any(tao."extraGoalObjectiveIds")
        OR (aror_e."objectiveId" = any(tao."originalGoalObjectiveIds")
          AND aror_e."objectiveId" != tao."originalGoalObjectiveIds"[1])
        LEFT JOIN (
          SELECT
            aror.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveResources" aror
          JOIN "ActivityReportObjectives" aro
          ON aror."activityReportObjectiveId" = aro.id
        ) aror_o
        ON aror_o."objectiveId" = tao."originalGoalObjectiveIds"[1]
        AND aror_e."resourceId" = aror_o."resourceId"
        WHERE aror_o.id is null
        GROUP BY 1,2
        RETURNING
          id,
          "activityReportObjectiveId",
          "resourceId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        srafo."activityReportObjectiveId",
        srafo."resourceId",
      srafo."createdAt",
      srafo."updatedAt"
      FROM sync_resources_across_affected_objectives srafo;
      -- 10. Sync resources into the objective
      DROP TABLE IF EXISTS tmp_sync_resource_to_objectives;
      CREATE TEMP TABLE tmp_sync_resource_to_objectives
      AS
      WITH sync_resource_to_objectives AS (
        INSERT INTO "ObjectiveResources" 
        (
          "objectiveId",
          "resourceId",
        "createdAt",
        "updatedAt"
        )
        SELECT
          aro."objectiveId" "objectiveId",
          tsrao."resourceId",
          MIN(tsrao."createdAt") "createdAt",
          MAX(tsrao."updatedAt") "updatedAt"
        FROM tmp_sync_resources_across_affected_objectives tsrao
        JOIN "ActivityReportObjectives" aro
        ON tsrao."activityReportObjectiveId" = aro.id
        LEFT JOIN "ObjectiveResources" ro
        ON tsrao."resourceId" = ro."resourceId"
        AND aro."objectiveId" = ro."objectiveId"
        WHERE ro.id IS NULL
        GROUP BY 1,2
        RETURNING
          id,
          "objectiveId",
          "resourceId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        srto."objectiveId",
        srto."resourceId",
        srto."createdAt",
        srto."updatedAt"
      FROM sync_resource_to_objectives srto;
      -- 11. Sync topics from extra activity report objectives to main objective
      DROP TABLE IF EXISTS tmp_sync_topics_across_affected_objectives;
      CREATE TEMP TABLE tmp_sync_topics_across_affected_objectives
      AS
      WITH sync_topics_across_affected_objectives AS (
        INSERT INTO "ActivityReportObjectiveTopics"
        (
          "activityReportObjectiveId",
          "topicId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aro.id "activityReportObjectiveId",
          arot_e."topicId" "topicId",
          MIN(arot_e."createdAt") "createdAt",
          MAX(arot_e."updatedAt") "updatedAt"
        FROM tmp_affected_objectives tao
        JOIN "ActivityReportObjectives" aro
        ON tao."activityReportId" = aro."activityReportId"
        AND tao."originalGoalObjectiveIds"[1] = aro."objectiveId"
        JOIN (
          SELECT
            arot.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveTopics" arot
          JOIN "ActivityReportObjectives" aro
          ON arot."activityReportObjectiveId" = aro.id
        ) arot_e
        ON arot_e."objectiveId" = any(tao."extraGoalObjectiveIds")
        OR (arot_e."objectiveId" = any(tao."originalGoalObjectiveIds")
          AND arot_e."objectiveId" != tao."originalGoalObjectiveIds"[1])
        LEFT JOIN (
          SELECT
            arot.*,
            aro."objectiveId"
          FROM "ActivityReportObjectiveTopics" arot
          JOIN "ActivityReportObjectives" aro
          ON arot."activityReportObjectiveId" = aro.id
        ) arot_o
        ON arot_o."objectiveId" = tao."originalGoalObjectiveIds"[1]
        AND arot_e."topicId" = arot_o."topicId"
        WHERE arot_o.id is null
        GROUP BY 1,2
        RETURNING
          id,
          "activityReportObjectiveId",
          "topicId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        stafo."activityReportObjectiveId",
        stafo."topicId",
        stafo."createdAt",
        stafo."updatedAt"
      FROM sync_topics_across_affected_objectives stafo;
      -- 12. Sync topics into the objective
      DROP TABLE IF EXISTS tmp_sync_topic_to_objectives;
      CREATE TEMP TABLE tmp_sync_topic_to_objectives
      AS
      WITH sync_topic_to_objectives AS (
        INSERT INTO "ObjectiveTopics" 
        (
          "objectiveId",
          "topicId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aro."objectiveId" "objectiveId",
          tstao."topicId",
          MIN(tstao."createdAt") "createdAt",
          MAX(tstao."updatedAt") "updatedAt"
        FROM tmp_sync_topics_across_affected_objectives tstao
        JOIN "ActivityReportObjectives" aro
        ON tstao."activityReportObjectiveId" = aro.id
        LEFT JOIN "ObjectiveTopics" ot
        ON tstao."topicId" = ot."topicId"
        AND aro."objectiveId" = ot."objectiveId"
        WHERE ot.id IS NULL
        GROUP BY 1,2
        RETURNING
          id,
          "objectiveId",
          "topicId",
          "createdAt",
          "updatedAt"
      )
      SELECT
        srto."objectiveId",
        srto."topicId",
        srto."createdAt",
        srto."updatedAt"
      FROM sync_topic_to_objectives srto;
      -- 13. Identify objectives to unlink from reports
      DROP TABLE IF EXISTS tmp_objectives_to_unlink_from_reports;
      CREATE TEMP TABLE tmp_objectives_to_unlink_from_reports
      AS
      WITH objectives_to_unlink AS (
        SELECT
          tao."activityReportId",
          ego."objectiveId"
        FROM tmp_affected_objectives tao
        CROSS JOIN UNNEST(tao."extraGoalObjectiveIds") ego("objectiveId")
        UNION
        SELECT
          tao."activityReportId",
          ego."objectiveId"
        FROM tmp_affected_objectives tao
        CROSS JOIN UNNEST(tao."originalGoalObjectiveIds") ego("objectiveId")
        WHERE ego."objectiveId" != tao."originalGoalObjectiveIds"[1]
      )
      SELECT
        aro.*
      FROM "ActivityReportObjectives" aro
      JOIN objectives_to_unlink otu
      ON aro."activityReportId" = otu."activityReportId"
      AND aro."objectiveId" = otu."objectiveId";
      -- 14. Remove courses for objectives to be unlinked
      DROP TABLE IF EXISTS tmp_removed_activity_report_objective_courses;
      CREATE TEMP TABLE tmp_removed_activity_report_objective_courses
      AS
      WITH remove_activity_report_objective_courses AS (
        SELECT
          aroc.id
        FROM tmp_objectives_to_unlink_from_reports totufr
        JOIN "ActivityReportObjectiveCourses" aroc
        ON totufr.id = aroc."activityReportObjectiveId"
      ),
      removed_activity_report_objective_courses AS (
        DELETE FROM "ActivityReportObjectiveCourses" aroc
        USING remove_activity_report_objective_courses raroc
        WHERE aroc.id = raroc.id
        RETURNING
          aroc.id,
          aroc."activityReportObjectiveId",
          aroc."courseId"
      )
      SELECT
        raroc.id,
        raroc."activityReportObjectiveId",
        raroc."courseId"
      FROM removed_activity_report_objective_courses raroc;
      -- 15. Remove files for objectives to be unlinked
      DROP TABLE IF EXISTS tmp_removed_activity_report_objective_files;
      CREATE TEMP TABLE tmp_removed_activity_report_objective_files
      AS
      WITH remove_activity_report_objective_files AS (
        SELECT
          arof.id
        FROM tmp_objectives_to_unlink_from_reports totufr
        JOIN "ActivityReportObjectiveFiles" arof
        ON totufr.id = arof."activityReportObjectiveId"
      ),
      removed_activity_report_objective_files AS (
        DELETE FROM "ActivityReportObjectiveFiles" arof
        USING remove_activity_report_objective_files rarof
        WHERE arof.id = rarof.id
        RETURNING
          arof.id,
          arof."activityReportObjectiveId",
          arof."fileId"
      )
      SELECT
        rarof.id,
        rarof."activityReportObjectiveId",
        rarof."fileId"
      FROM removed_activity_report_objective_files rarof;
      -- 16. Remove resources for objectives to be unlinked
      DROP TABLE IF EXISTS tmp_removed_activity_report_objective_resources;
      CREATE TEMP TABLE tmp_removed_activity_report_objective_resources
      AS
      WITH remove_activity_report_objective_resources AS (
        SELECT
          aror.id
        FROM tmp_objectives_to_unlink_from_reports totufr
        JOIN "ActivityReportObjectiveResources" aror
        ON totufr.id = aror."activityReportObjectiveId"
      ),
      removed_activity_report_objective_resources AS (
        DELETE FROM "ActivityReportObjectiveResources" aror
        USING remove_activity_report_objective_resources raror
        WHERE aror.id = raror.id
        RETURNING
          aror.id,
          aror."activityReportObjectiveId",
          aror."resourceId"
      )
      SELECT
        raror.id,
        raror."activityReportObjectiveId",
        raror."resourceId"
      FROM removed_activity_report_objective_resources raror;
      -- 17. Remove topics for objectives to be unlinked
      DROP TABLE IF EXISTS tmp_removed_activity_report_objective_topics;
      CREATE TEMP TABLE tmp_removed_activity_report_objective_topics
      AS
      WITH remove_activity_report_objective_topics AS (
        SELECT
          arot.id
        FROM tmp_objectives_to_unlink_from_reports totufr
        JOIN "ActivityReportObjectiveTopics" arot
        ON totufr.id = arot."activityReportObjectiveId"
      ),
      removed_activity_report_objective_topics AS (
        DELETE FROM "ActivityReportObjectiveTopics" arot
        USING remove_activity_report_objective_topics rarot
        WHERE arot.id = rarot.id
        RETURNING
          arot.id,
          arot."activityReportObjectiveId",
          arot."topicId"
      )
      SELECT
        rarot.id,
        rarot."activityReportObjectiveId",
        rarot."topicId"
      FROM removed_activity_report_objective_topics rarot;
      --  18. Remove activity report objective records that are to be unlinked
      DROP TABLE IF EXISTS tmp_removed_activity_report_objectives;
      CREATE TEMP TABLE tmp_removed_activity_report_objectives
      AS
      WITH removed_activity_report_objectives AS (
        DELETE FROM "ActivityReportObjectives" aro
        USING tmp_objectives_to_unlink_from_reports totufr
        WHERE aro."activityReportId" = totufr."activityReportId"
        AND aro."objectiveId" = totufr."objectiveId"
        RETURNING
          aro.id,
          aro."activityReportId",
          aro."objectiveId"
      )
      SELECT
        raro.id,
        raro."activityReportId",
        raro."objectiveId"
      FROM removed_activity_report_objectives raro;
      -- 19. Collect a list of objectives to remove as they are no longer referenced on any report
      DROP TABLE IF EXISTS tmp_objectives_to_remove;
      CREATE TEMP TABLE tmp_objectives_to_remove
      AS
      SELECT
        traro."objectiveId"
      FROM tmp_removed_activity_report_objectives traro
      LEFT JOIN "ActivityReportObjectives" aro
      ON traro."objectiveId" = aro."objectiveId"
      WHERE aro.id IS NULL;
      -- 20. Remove objective courses for objective to be removed
      -- 21. Remove objective files for objective to be removed
      -- 22. Remove objective resources for objective to be removed
      -- 23. Remove objective topics for objective to be removed
      -- 24. Remove objectives that are no longer referenced on any report
      
      -- x. Sets of Grant may/may not have matching objectives
      -- x. When not matching objectives are found, clone objective and aro to first goal
      -- x. Remove second goals objectives from AR
      DROP TABLE IF EXISTS tmp_delete_objective_from_report;
      CREATE TEMP TABLE tmp_delete_objective_from_report
      AS
      WITH delete_activity_report_objectives AS (
        DELETE FROM "ActivityReportObjectives" aro
        USING tmp_unlinked_objectives tuo
        WHERE aro."objectiveId" = tug."objectiveId"
        RETURNING
          aro.id "activityReportObjectiveId",
          aro."activityReportId",
          aro."objectiveId"
      )
      SELECT
        "activityReportObjectiveId",
        "activityReportId",
        "objectiveId"
      FROM delete_activity_report_objectives;

      -- x. Update onAR and onApprovedAR for unlinked objective
      DROP TABLE IF EXISTS tmp_flags_update_for_unlinked_objectives;
      CREATE TEMP TABLE tmp_flags_update_for_unlinked_objectives
      AS
      WITH objective_flags AS (
        SELECT
          tdofr."objectiveId",
          count(arg.id) FILTER (WHERE arg.id IS NOT NULL) > 0 "onAR",
          COUNT(ar.id) FILTER (WHERE ar.id IS NOT NULL) > 0 "onApprovedAR"
        FROM tmp_delete_objective_from_report tdofr
        LEFT JOIN "ActivityReportObjectives" aro
        ON tdofr."objectiveId" = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND ar."calculatedStatus"::text = 'approved'
        GROUP BY 1
      ),
      flags_update_for_unlinked_objectives AS (
        UPDATE "Objectives" g
        SET
          "onAR" = f."onAR",
          "onApprovedAR" = f."onApprovedAR"
        FROM objective_flags f
        WHERE o.id = f."objectiveId"
        AND (
          o."onAR" != f."onAR"
          OR o."onApprovedAR" != f."onApprovedAR"
        )
        RETURNING
          o.id "objectiveId"
      )
      SELECT
        "objectiveId",
        "onAR",
        "onApprovedAR"
      FROM flags_update_for_unlinked_objectives;

      -- x. If unlinked objective onAR is false, delete objective
      DROP TABLE IF EXISTS tmp_deleted_objectives;
      CREATE TEMP TABLE tmp_deleted_objectives
      AS
      WITH deleted_objectives AS (
        UPDATE "Objectives" o
        SET "deletedAt" = now()
        FROM tmp_unlinked_objectives tuo
        WHERE o.id = tuo."objectiveId"
        AND o."onAR" = false
        RETURNING
          o.id "objectiveId"
      )
      SELECT
        "objectiveId"
      FROM deleted_objectives;

      -- x. Remove second goal from AR
      DROP TABLE IF EXISTS tmp_delete_goal_from_report;
      CREATE TEMP TABLE tmp_delete_goal_from_report
      AS
      WITH delete_activity_report_goals AS (
        DELETE FROM "ActivityReportGoals" arg
        USING tmp_unlinked_goals tug
        WHERE arg."goalId" = tug."goalId"
        RETURNING
          arg.id "activityReportGoalId",
          arg."activityReportId",
          arg."goalId"
      )
      SELECT
        "activityReportGoalId",
        "activityReportId",
        "goalId"
      FROM delete_activity_report_goals;

      -- x. Update onAR and onApprovedAR for unlinked goal
      DROP TABLE IF EXISTS tmp_flags_update_for_unlinked_goals;
      CREATE TEMP TABLE tmp_flags_update_for_unlinked_goals
      AS
      WITH goal_flags AS (
        SELECT
          tdgfr."goalId",
          count(arg.id) FILTER (WHERE arg.id IS NOT NULL) > 0 "onAR",
          COUNT(ar.id) FILTER (WHERE ar.id IS NOT NULL) > 0 "onApprovedAR"
        FROM tmp_delete_goal_from_report tdgfr
        LEFT JOIN "ActivityReportGoals" arg
        ON tdgfr."goalId" = arg."goalId"
        LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        AND ar."calculatedStatus"::text = 'approved'
        GROUP BY 1
      ),
      flags_update_for_unlinked_goals AS (
        UPDATE "Goals" g
        SET
          "onAR" = gf."onAR",
          "onApprovedAR" = gf."onApprovedAR"
        FROM goal_flags gf
        WHERE g.id = gf."goalId"
        AND (
          g."onAR" != gf."onAR"
          OR g."onApprovedAR" != gf."onApprovedAR"
        )
        RETURNING
          g.id "goalId"
      )
      SELECT
        "goalId",
        "onAR",
        "onApprovedAR"
      FROM flags_update_for_unlinked_goals;

      --
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
