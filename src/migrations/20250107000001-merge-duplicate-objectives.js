const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        -- This merges duplicate Objectives that were EITHER:
        -- - created on the same AR
        -- - created on different ARs, but are not 'Completed'
        --
        -- The merged-away Objective will be merged into a target Objective with a greater
        -- status progression than the merged-away Objective and is EITHER:
        -- - the next duplicate Objective in time to be set to "Completed"
        -- - the most advanced Objective when there is no next "Completed" Objective

        -- Find all candidate duplicates

        DROP TABLE IF EXISTS objective_merges;
        CREATE TEMP TABLE objective_merges
        AS
        WITH candidate_dupe_pairs AS (
        -- Get all the title, goalId pairs seen more than once
        SELECT
          title d_title,
          "goalId" d_gid
        FROM "Objectives"
        WHERE "deletedAt" IS NULL
        GROUP BY 1,2
        HAVING COUNT(*) > 1
        ), candidate_dupes AS (
        -- get all the Objectives that have the candidate dupe pair
        SELECT
          id oid,
          status,
          MD5(d_title) || '-' || d_gid cd_set_signature,
          "createdAt" cd_create_time
        FROM candidate_dupe_pairs
        JOIN "Objectives"
          ON title = d_title
          AND "goalId" = d_gid
        WHERE "deletedAt" IS NULL
        ), uncompleted_sets AS (
        -- only sets with at least one uncompleted Objective should be examined
        SELECT DISTINCT cd_set_signature us_signature
        FROM candidate_dupes
        WHERE status != 'Complete'
        ), completed_candidates AS (
        -- link completed Objectives to their completion events
        SELECT
          oid c_oid,
          dml_timestamp complete_time,
          ROW_NUMBER() OVER (
            PARTITION BY oid
            ORDER BY dml_timestamp DESC
          ) final_complete_rank
        FROM candidate_dupes
        JOIN uncompleted_sets
          ON cd_set_signature = us_signature
        JOIN "ZALObjectives"
          ON data_id = oid
        WHERE status = 'Complete'
          AND new_row_data->>'status' = 'Complete'
        ), dupe_collections AS (
        -- create a collection of dupes that might need merging
        SELECT
          oid,
          status,
          cd_create_time create_time,
          complete_time,
          us_signature set_signature
        FROM candidate_dupes
        JOIN uncompleted_sets
          ON cd_set_signature = us_signature
        LEFT JOIN completed_candidates
          ON oid = c_oid
          AND final_complete_rank = 1
        ), future_completes AS (
        -- Link uncomplete Objectives to any future dupes that are Complete
        SELECT
          base.oid uncomplete_oid,
          future_completes.oid future_complete_oid,
          ROW_NUMBER() OVER (
            PARTITION BY base.oid
            ORDER BY future_completes.complete_time
          ) closest_complete_rank,
          base.set_signature
        FROM dupe_collections base
        LEFT JOIN dupe_collections future_completes
          ON base.set_signature = future_completes.set_signature
          AND future_completes.complete_time > base.create_time
        ), open_sets AS (
        -- get cases where there is no future complete and multiple dupes, which also need merging
        SELECT
          set_signature,
          uncomplete_oid,
          SUM(CASE WHEN future_complete_oid IS NULL THEN 1 ELSE 0 END) OVER (
            PARTITION BY set_signature
          ) unmatched_sum
        FROM future_completes
        WHERE future_complete_oid IS NULL
        ), ranked_status AS (
        -- creating a status ranking so that active statuses outrank inactive
        SELECT 'Not Started' stat, 1 srank
        UNION SELECT 'In Progress', 2
        UNION SELECT 'Suspended', 2
        ), ranked_updates AS (
        -- Find which update was the most recent amongst all the Objectives in the set
        -- so we can use that as the receiving Objective
        SELECT
          uncomplete_oid,
          set_signature,
          dml_timestamp,
          new_row_data->>'status' zstatus,
          ROW_NUMBER() OVER (
            PARTITION BY set_signature
            ORDER BY srank DESC, dml_timestamp DESC
          ) latest_status_rank
        FROM open_sets
        JOIN "ZALObjectives"
          ON uncomplete_oid = data_id
        JOIN ranked_status
          ON new_row_data->>'status' = stat
        WHERE unmatched_sum > 1
        )
        -- Union the merge-to-current and merge-to-complete sets
        -- Objectives not in this list don't need merging because they are
        -- either already complete or the last updated non-closed objective
        SELECT DISTINCT
          donor.uncomplete_oid donor_oid,
          heir.uncomplete_oid target_oid,
          donor.set_signature,
          'to current' inheritance_type
        FROM ranked_updates donor
        JOIN ranked_updates heir
          ON donor.set_signature = heir.set_signature
          AND heir.latest_status_rank = 1
        WHERE donor.uncomplete_oid != heir.uncomplete_oid
        UNION
        SELECT
          uncomplete_oid donor_oid,
          future_complete_oid,
          set_signature,
          'to complete'
        FROM future_completes
        WHERE closest_complete_rank = 1
          AND uncomplete_oid != future_complete_oid
          AND future_complete_oid IS NOT NULL
        ;

        -- Merge objective collaborators
        DROP TABLE IF EXISTS relinked_objective_collaborators;
        CREATE TEMP TABLE relinked_objective_collaborators
        AS
        WITH updater AS (
          WITH unmatched AS (
            SELECT
              donor_oid,
              "userId" uid
            FROM objective_merges om
            JOIN "ObjectiveCollaborators" oc
              ON om.donor_oid = oc."objectiveId"
            EXCEPT
            SELECT
              donor_oid,
              "userId"
            FROM objective_merges om
            JOIN "ObjectiveCollaborators" oc
              ON om.target_oid = oc."objectiveId"
          )
          UPDATE "ObjectiveCollaborators" AS oc
          SET "objectiveId" = target_oid
          FROM objective_merges om
          JOIN unmatched u
            ON u.donor_oid = om.donor_oid
          WHERE oc."userId" = u.uid
            AND oc."objectiveId" = u.donor_oid
          RETURNING
            id ocid,
            om.donor_oid original_oid
        ) SELECT * FROM updater
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

        -- Update AROs associated with donor Objectives to point at target Objectives
        -- This allows running the standard ARO deduplication logic
        DROP TABLE IF EXISTS redirected_aros;
        CREATE TEMP TABLE redirected_aros
        AS
        WITH updater AS (
          UPDATE "ActivityReportObjectives" AS aro
          SET "objectiveId" = target_oid
          FROM objective_merges om
          JOIN "ActivityReportObjectives" d_aro
            ON d_aro."objectiveId" = donor_oid
          WHERE d_aro.id = aro.id
          RETURNING
            aro.id aroid,
            d_aro.id donor_aroid,
            target_oid,
            donor_oid
        ) SELECT * FROM updater
        ;
        
        --------------------------------------------------------------------------------
        -- START Apply the logic for ARO deduplication ---------------------------------
        --------------------------------------------------------------------------------

        -- Create temporary table for dup_aro_sets
        DROP TABLE IF EXISTS temp_dup_aro_sets;
        CREATE TEMP TABLE temp_dup_aro_sets
        AS
        WITH dupe_aro_pairs AS (
        SELECT
          "activityReportId" arid,
          "objectiveId" oid
        FROM "ActivityReportObjectives"
        GROUP BY 1,2
        HAVING COUNT(id) > 1
        ),
        dupe_aros AS (
        SELECT
          arid,
          oid,
          id aroid
        FROM "ActivityReportObjectives"
        JOIN dupe_aro_pairs
          ON "activityReportId" = arid
          AND "objectiveId" = oid
        )
        SELECT
          arid "activityReportId",
          oid "objectiveId",
          min(zaro.dml_timestamp) "min_dml_timestamp",
          max(zaro.dml_timestamp) "max_dml_timestamp",
          COUNT(zaro.id) "count_id",
          array_agg(zaro.data_id ORDER BY zaro.data_id ASC) "aroIds"
        FROM dupe_aros
        JOIN "ZALActivityReportObjectives" zaro
          ON zaro.data_id = aroid
        GROUP BY 1,2
        ORDER BY 3 DESC;

        -- Create temporary table for reduced_arot
        DROP TABLE IF EXISTS temp_reduced_arot;
        CREATE TEMP TABLE temp_reduced_arot
        AS
        SELECT
          das."activityReportId",
          das."objectiveId",
          das."aroIds"[1] "activityReportObjectiveId",
          arot."topicId",
          MIN(arot."createdAt") "createdAt",
          MAX(arot."updatedAt") "updatedAt",
          ARRAY_AGG(arot.id) ids
        FROM temp_dup_aro_sets das
        JOIN "ActivityReportObjectiveTopics" arot
        ON arot."activityReportObjectiveId" = ANY (das."aroIds")
        GROUP BY 1,2,3,4;

        -- Update matching records in ActivityReportObjectiveTopics
        DROP TABLE IF EXISTS temp_updated_topics;
        CREATE TEMP TABLE temp_updated_topics
        AS
        WITH updated_rows AS (
            UPDATE "ActivityReportObjectiveTopics" t
            SET
                "createdAt" = s."createdAt",
                "updatedAt" = s."updatedAt"
            FROM temp_reduced_arot s
            WHERE t."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND t."topicId" = s."topicId"
            RETURNING t.*
        )
        SELECT * FROM updated_rows;

        -- Insert non-matching records into ActivityReportObjectiveTopics
        DROP TABLE IF EXISTS temp_inserted_topics;
        CREATE TEMP TABLE temp_inserted_topics
        AS
        WITH inserted_rows AS (
            INSERT INTO "ActivityReportObjectiveTopics" (
                "activityReportObjectiveId",
                "topicId",
                "createdAt",
                "updatedAt"
            )
            SELECT
                s."activityReportObjectiveId",
                s."topicId",
                s."createdAt",
                s."updatedAt"
            FROM temp_reduced_arot s
            LEFT JOIN "ActivityReportObjectiveTopics" t
            ON t."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND t."topicId" = s."topicId"
            WHERE t."activityReportObjectiveId" IS NULL
            AND t."topicId" IS NULL
            RETURNING *
        )
        SELECT * FROM inserted_rows;

        -- Delete operation for ActivityReportObjectiveTopics
        DROP TABLE IF EXISTS temp_deleted_topics;
        CREATE TEMP TABLE temp_deleted_topics
        AS
        WITH deleted_rows AS (
            DELETE FROM "ActivityReportObjectiveTopics" t
            USING temp_reduced_arot r
            WHERE t."topicId" = r."topicId"
            AND t.id = ANY (r.ids)
            AND t."activityReportObjectiveId" != r."activityReportObjectiveId"
            RETURNING t.*
        )
        SELECT * FROM deleted_rows;

        -- Create temporary table for reduced_aroc
        DROP TABLE IF EXISTS temp_reduced_aroc;
        CREATE TEMP TABLE temp_reduced_aroc
        AS
        SELECT
          das."activityReportId",
          das."objectiveId",
          das."aroIds"[1] "activityReportObjectiveId",
          aroc."courseId",
          MIN(aroc."createdAt") "createdAt",
          MAX(aroc."updatedAt") "updatedAt",
          ARRAY_AGG(aroc.id) ids
        FROM temp_dup_aro_sets das
        JOIN "ActivityReportObjectiveCourses" aroc
        ON aroc."activityReportObjectiveId" = ANY (das."aroIds")
        GROUP BY 1,2,3,4;

        -- Update matching records in ActivityReportObjectiveCourses
        DROP TABLE IF EXISTS temp_updated_courses;
        CREATE TEMP TABLE temp_updated_courses
        AS
        WITH updated_rows AS (
            UPDATE "ActivityReportObjectiveCourses" c
            SET
                "createdAt" = s."createdAt",
                "updatedAt" = s."updatedAt"
            FROM temp_reduced_aroc s
            WHERE c."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND c."courseId" = s."courseId"
            RETURNING c.*
        )
        SELECT * FROM updated_rows;

        -- Insert non-matching records into ActivityReportObjectiveCourses
        DROP TABLE IF EXISTS temp_inserted_courses;
        CREATE TEMP TABLE temp_inserted_courses
        AS
        WITH inserted_rows AS (
            INSERT INTO "ActivityReportObjectiveCourses" (
                "activityReportObjectiveId",
                "courseId",
                "createdAt",
                "updatedAt"
            )
            SELECT
                s."activityReportObjectiveId",
                s."courseId",
                s."createdAt",
                s."updatedAt"
            FROM temp_reduced_aroc s
            LEFT JOIN "ActivityReportObjectiveCourses" c
            ON c."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND c."courseId" = s."courseId"
            WHERE c."activityReportObjectiveId" IS NULL
            AND c."courseId" IS NULL
            RETURNING *
        )
        SELECT * FROM inserted_rows;

        -- Delete operation for ActivityReportObjectiveCourses
        DROP TABLE IF EXISTS temp_deleted_courses;
        CREATE TEMP TABLE temp_deleted_courses
        AS
        WITH deleted_rows AS (
            DELETE FROM "ActivityReportObjectiveCourses" c
            USING temp_reduced_aroc r
            WHERE c."courseId" = r."courseId"
            AND c.id = ANY (r.ids)
            AND c."activityReportObjectiveId" != r."activityReportObjectiveId"
            RETURNING c.*
        )
        SELECT * FROM deleted_rows;


        -- Create temporary table for reduced_arof
        DROP TABLE IF EXISTS temp_reduced_arof;
        CREATE TEMP TABLE temp_reduced_arof
        AS
        SELECT
          das."activityReportId",
          das."objectiveId",
          das."aroIds"[1] "activityReportObjectiveId",
          arof."fileId",
          MIN(arof."createdAt") "createdAt",
          MAX(arof."updatedAt") "updatedAt",
          ARRAY_AGG(arof.id) ids
        FROM temp_dup_aro_sets das
        JOIN "ActivityReportObjectiveFiles" arof
        ON arof."activityReportObjectiveId" = ANY (das."aroIds")
        GROUP BY 1,2,3,4;

        -- Update matching records in ActivityReportObjectiveFiles
        DROP TABLE IF EXISTS temp_updated_files;
        CREATE TEMP TABLE temp_updated_files
        AS
        WITH updated_rows AS (
            UPDATE "ActivityReportObjectiveFiles" f
            SET
                "createdAt" = s."createdAt",
                "updatedAt" = s."updatedAt"
            FROM temp_reduced_arof s
            WHERE f."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND f."fileId" = s."fileId"
            RETURNING f.*
        )
        SELECT * FROM updated_rows;

        -- Insert non-matching records into ActivityReportObjectiveFiles
        DROP TABLE IF EXISTS temp_inserted_files;
        CREATE TEMP TABLE temp_inserted_files
        AS
        WITH inserted_rows AS (
            INSERT INTO "ActivityReportObjectiveFiles" (
                "activityReportObjectiveId",
                "fileId",
                "createdAt",
                "updatedAt"
            )
            SELECT
                s."activityReportObjectiveId",
                s."fileId",
                s."createdAt",
                s."updatedAt"
            FROM temp_reduced_arof s
            LEFT JOIN "ActivityReportObjectiveFiles" f
            ON f."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND f."fileId" = s."fileId"
            WHERE f."activityReportObjectiveId" IS NULL
            AND f."fileId" IS NULL
            RETURNING *
        )
        SELECT * FROM inserted_rows;

        -- Delete operation for ActivityReportObjectiveFiles
        DROP TABLE IF EXISTS temp_deleted_files;
        CREATE TEMP TABLE temp_deleted_files
        AS
        WITH deleted_rows AS (
            DELETE FROM "ActivityReportObjectiveFiles" f
            USING temp_reduced_arof r
            WHERE f."fileId" = r."fileId"
            AND f.id = ANY (r.ids)
            AND f."activityReportObjectiveId" != r."activityReportObjectiveId"
            RETURNING f.*
        )
        SELECT * FROM deleted_rows;


        -- Create temporary table for reduced_aror
        DROP TABLE IF EXISTS temp_reduced_aror;
        CREATE TEMP TABLE temp_reduced_aror
        AS
        SELECT
          das."activityReportId",
          das."objectiveId",
          das."aroIds"[1] "activityReportObjectiveId",
          aror."resourceId",
          MIN(aror."createdAt") "createdAt",
          MAX(aror."updatedAt") "updatedAt",
          ARRAY_AGG(aror.id) ids
        FROM temp_dup_aro_sets das
        JOIN "ActivityReportObjectiveResources" aror
        ON aror."activityReportObjectiveId" = ANY (das."aroIds")
        GROUP BY 1,2,3,4;

        -- Update matching records in ActivityReportObjectiveResources
        DROP TABLE IF EXISTS temp_updated_resources;
        CREATE TEMP TABLE temp_updated_resources
        AS
        WITH updated_rows AS (
            UPDATE "ActivityReportObjectiveResources" r
            SET
                "createdAt" = s."createdAt",
                "updatedAt" = s."updatedAt"
            FROM temp_reduced_aror s
            WHERE r."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND r."resourceId" = s."resourceId"
            RETURNING r.*
        )
        SELECT * FROM updated_rows;

        -- Insert non-matching records into ActivityReportObjectiveResources
        DROP TABLE IF EXISTS temp_inserted_resources;
        CREATE TEMP TABLE temp_inserted_resources
        AS
        WITH inserted_rows AS (
            INSERT INTO "ActivityReportObjectiveResources" (
                "activityReportObjectiveId",
                "resourceId",
                "createdAt",
                "updatedAt"
            )
            SELECT
                s."activityReportObjectiveId",
                s."resourceId",
                s."createdAt",
                s."updatedAt"
            FROM temp_reduced_aror s
            LEFT JOIN "ActivityReportObjectiveResources" r
            ON r."activityReportObjectiveId" = s."activityReportObjectiveId"
            AND r."resourceId" = s."resourceId"
            WHERE r."activityReportObjectiveId" IS NULL
            AND r."resourceId" IS NULL
            RETURNING *
        )
        SELECT * FROM inserted_rows;

        -- Delete operation for ActivityReportObjectiveResources
        DROP TABLE IF EXISTS temp_deleted_resources;
        CREATE TEMP TABLE temp_deleted_resources
        AS
        WITH deleted_rows AS (
            DELETE FROM "ActivityReportObjectiveResources" r
            USING temp_reduced_aror t
            WHERE r."resourceId" = t."resourceId"
            AND r.id = ANY (t.ids)
            AND r."activityReportObjectiveId" != t."activityReportObjectiveId"
            RETURNING r.*
        )
        SELECT * FROM deleted_rows;

        -- Create temporary table for reduced_aro
        DROP TABLE IF EXISTS temp_reduced_aro;
        CREATE TEMP TABLE temp_reduced_aro
        AS
        WITH ttap_upd_seq AS ( -- get the update list for each aro set
        SELECT
          new_row_data->>'ttaProvided' ttap,
          das."aroIds"[1] dest_aroid,
          MAX(LENGTH(new_row_data->>'ttaProvided')) OVER (PARTITION BY "activityReportId", "objectiveId") maxlength,
          zaro.id zaroid
        FROM temp_dup_aro_sets das
        JOIN "ZALActivityReportObjectives" zaro
          ON zaro.data_id = ANY("aroIds")
        WHERE  new_row_data->'ttaProvided' IS NOT NULL
        ),
        ranked_ttap_upd AS ( -- rank the update list per the criteria
        SELECT
          ttap,
          dest_aroid,
          zaroid,
          maxlength,
          ROW_NUMBER() OVER (
            PARTITION BY dest_aroid
            ORDER BY (LENGTH(ttap) < 10 AND (maxlength / (LENGTH(ttap)+1)) > 8), zaroid DESC
          ) select_order
        FROM ttap_upd_seq
        )
        SELECT
          das."activityReportId",
          das."objectiveId",
          rtu.dest_aroid id,
          MIN(aro."createdAt") "createdAt",
          MAX(aro."updatedAt") "updatedAt",
          rtu.ttap "ttaProvided",
          (ARRAY_AGG(aro."title" ORDER BY LENGTH(aro."title") DESC))[1] "title",
          CASE MAX(CASE
              WHEN aro.status = 'Complete' THEN 4
              WHEN aro.status = 'Suspended' THEN 3
              WHEN aro.status = 'In Progress' THEN 2
              WHEN aro.status = 'Not Started' THEN 1
              ELSE 0 -- for handling NULLs if necessary
          END)
              WHEN 4 THEN 'Complete'
              WHEN 3 THEN 'Suspended'
              WHEN 2 THEN 'In Progress'
              WHEN 1 THEN 'Not Started'
              ELSE NULL -- optional, in case you want to handle cases where all are NULL
          END AS status,
          MIN(aro."arOrder") "arOrder",
          (ARRAY_AGG(aro."closeSuspendReason" ORDER BY LENGTH(aro."closeSuspendReason"::text) DESC))[1] "closeSuspendReason",
          (ARRAY_AGG(aro."closeSuspendContext" ORDER BY LENGTH(aro."closeSuspendContext") DESC))[1] "closeSuspendContext",
          (ARRAY_AGG(aro."originalObjectiveId" ORDER BY aro."originalObjectiveId"))[1] "originalObjectiveId",
          CASE MAX(CASE
              WHEN aro."supportType" = 'Maintaining' THEN 4
              WHEN aro."supportType" = 'Implementing' THEN 3
              WHEN aro."supportType" = 'Introducing' THEN 2
              WHEN aro."supportType" = 'Planning' THEN 1
              ELSE 0 -- for handling NULLs if necessary
          END)
              WHEN 4 THEN 'Maintaining'
              WHEN 3 THEN 'Implementing'
              WHEN 2 THEN 'Introducing'
              WHEN 1 THEN 'Planning'
              ELSE NULL -- optional, in case you want to handle cases where all are NULL
          END AS "supportType",
          bool_or(aro."objectiveCreatedHere") "objectiveCreatedHere",
          array_agg(aro.id order by aro.id) "aroIds"
        FROM temp_dup_aro_sets das
        JOIN ranked_ttap_upd rtu
          ON rtu.select_order = 1
          AND rtu.dest_aroid = ANY (das."aroIds")
        JOIN "ActivityReportObjectives" aro
          ON aro.id = ANY (das."aroIds")
        GROUP BY 1,2,3,6;

        -- Update matching records in ActivityReportObjectives
        DROP TABLE IF EXISTS temp_updated_aro;
        CREATE TEMP TABLE temp_updated_aro
        AS
        WITH updated_rows AS (
            UPDATE "ActivityReportObjectives" o
            SET
                "createdAt" = s."createdAt",
                "updatedAt" = s."updatedAt",
                "ttaProvided" = s."ttaProvided",
                "title" = s."title",
                "status" = s."status",
                "arOrder" = s."arOrder",
                "closeSuspendReason" = s."closeSuspendReason",
                "closeSuspendContext" = s."closeSuspendContext",
                "originalObjectiveId" = s."originalObjectiveId",
                "supportType" = s."supportType"::"enum_ActivityReportObjectives_supportType",
                "objectiveCreatedHere" = s."objectiveCreatedHere"
            FROM temp_reduced_aro s
            WHERE o.id = s.id
            AND o."objectiveId" = s."objectiveId"
            AND o."activityReportId" = s."activityReportId"
            RETURNING o.*
        )
        SELECT * FROM updated_rows;

        -- Insert non-matching records into ActivityReportObjectives
        -- There should never be an INSERT performed here, but the code is present to complete the structure UID structure
        DROP TABLE IF EXISTS temp_inserted_aro;
        CREATE TEMP TABLE temp_inserted_aro
        AS
        WITH inserted_rows AS (
            INSERT INTO "ActivityReportObjectives" (
                "activityReportId",
                "objectiveId",
                "id",
                "createdAt",
                "updatedAt",
                "ttaProvided",
                "title",
                "status",
                "arOrder",
                "closeSuspendReason",
                "closeSuspendContext",
                "originalObjectiveId",
                "supportType",
                "objectiveCreatedHere"
            )
            SELECT
                s."activityReportId",
                s."objectiveId",
                s.id,
                s."createdAt",
                s."updatedAt",
                s."ttaProvided",
                s."title",
                s."status",
                s."arOrder",
                s."closeSuspendReason",
                s."closeSuspendContext",
                s."originalObjectiveId",
                s."supportType"::"enum_ActivityReportObjectives_supportType",
                s."objectiveCreatedHere"
            FROM temp_reduced_aro s
            LEFT JOIN "ActivityReportObjectives" o
            ON o.id = s.id
            AND o."objectiveId" = s."objectiveId"
            AND o."activityReportId" = s."activityReportId"
            WHERE o.id IS NULL
            RETURNING *
        )
        SELECT * FROM inserted_rows;

        -- Delete operation for ActivityReportObjectives
        DROP TABLE IF EXISTS temp_deleted_aro;
        CREATE TEMP TABLE temp_deleted_aro
        AS
        WITH deleted_rows AS (
            DELETE FROM "ActivityReportObjectives" o
            USING temp_reduced_aro r
            WHERE o."objectiveId" = r."objectiveId"
            AND o."activityReportId" = r."activityReportId"
            AND o.id = ANY (ARRAY_REMOVE(r."aroIds", r."aroIds"[1]))
            RETURNING o.*
        )
        SELECT * FROM deleted_rows;

        --------------------------------------------------------------------------------
        -- FINISHED Apply the logic for ARO deduplication ------------------------------
        --------------------------------------------------------------------------------

        -- results of ARO dedupe
        SELECT
            'ActivityReportObjectiveTopics' AS table_name,
            COALESCE(u.updated_count, 0) AS updated_count,
            COALESCE(i.inserted_count, 0) AS inserted_count,
            COALESCE(d.deleted_count, 0) AS deleted_count
        FROM
            (SELECT COUNT(*) AS updated_count FROM temp_updated_topics) u,
            (SELECT COUNT(*) AS inserted_count FROM temp_inserted_topics) i,
            (SELECT COUNT(*) AS deleted_count FROM temp_deleted_topics) d
        UNION ALL
        SELECT
            'ActivityReportObjectiveCourses' AS table_name,
            COALESCE(u.updated_count, 0) AS updated_count,
            COALESCE(i.inserted_count, 0) AS inserted_count,
            COALESCE(d.deleted_count, 0) AS deleted_count
        FROM
            (SELECT COUNT(*) AS updated_count FROM temp_updated_courses) u,
            (SELECT COUNT(*) AS inserted_count FROM temp_inserted_courses) i,
            (SELECT COUNT(*) AS deleted_count FROM temp_deleted_courses) d
        UNION ALL
        SELECT
            'ActivityReportObjectiveFiles' AS table_name,
            COALESCE(u.updated_count, 0) AS updated_count,
            COALESCE(i.inserted_count, 0) AS inserted_count,
            COALESCE(d.deleted_count, 0) AS deleted_count
        FROM
            (SELECT COUNT(*) AS updated_count FROM temp_updated_files) u,
            (SELECT COUNT(*) AS inserted_count FROM temp_inserted_files) i,
            (SELECT COUNT(*) AS deleted_count FROM temp_deleted_files) d
        UNION ALL
        SELECT
            'ActivityReportObjectiveResources' AS table_name,
            COALESCE(u.updated_count, 0) AS updated_count,
            COALESCE(i.inserted_count, 0) AS inserted_count,
            COALESCE(d.deleted_count, 0) AS deleted_count
        FROM
            (SELECT COUNT(*) AS updated_count FROM temp_updated_resources) u,
            (SELECT COUNT(*) AS inserted_count FROM temp_inserted_resources) i,
            (SELECT COUNT(*) AS deleted_count FROM temp_deleted_resources) d
        UNION ALL
        SELECT
            'ActivityReportObjectives' AS table_name,
            COALESCE(u.updated_count, 0) AS updated_count,
            COALESCE(i.inserted_count, 0) AS inserted_count,
            COALESCE(d.deleted_count, 0) AS deleted_count
        FROM
            (SELECT COUNT(*) AS updated_count FROM temp_updated_aro) u,
            (SELECT COUNT(*) AS inserted_count FROM temp_inserted_aro) i,
            (SELECT COUNT(*) AS deleted_count FROM temp_deleted_aro) d;

        --------------------------------------------------------------------------------
        -- RESUME Objective deduplication section --------------------------------------
        --------------------------------------------------------------------------------
        
        -- Delete duplicate objective collaborators
        DROP TABLE IF EXISTS deleted_objective_collaborators;
        CREATE TEMP TABLE deleted_objective_collaborators
        AS
        WITH updater AS (
          DELETE FROM "ObjectiveCollaborators"
          USING objective_merges
          WHERE "objectiveId" = donor_oid
          RETURNING
            id ocid,
            donor_oid
        ) SELECT * FROM updater
        ;

        -- Soft delete operation for duplicate Objectives
        -- Originally this was a hard delete, but that breaks the
        -- ActivityReportObjectives_originalObjectiveId_fkey constraint
        -- and updating originalObjectiveId seems like a bad idea
        DROP TABLE IF EXISTS temp_deleted_objectives;
        CREATE TEMP TABLE temp_deleted_objectives
        AS
        WITH deleted_rows AS (
            UPDATE "Objectives" o
            SET "deletedAt" = NOW()
            FROM objective_merges om
            WHERE donor_oid = id
            RETURNING o.*
        )
        SELECT * FROM deleted_rows;

        SELECT
          1 op_order,
          'deleted_objectives' operation,
          COUNT(*) cnt
        FROM temp_deleted_objectives
        UNION SELECT 2,'updated_target_objectives', COUNT(*) FROM updated_target_objectives
        UNION SELECT 16,'relinked_objective_collaborators', COUNT(*) FROM relinked_objective_collaborators
        UNION SELECT 17,'deleted_objective_collaborators', COUNT(*) FROM deleted_objective_collaborators
        ORDER BY 1
        ;


      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
