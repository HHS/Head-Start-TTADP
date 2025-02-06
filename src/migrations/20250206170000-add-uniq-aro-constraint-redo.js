const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(`
        -- This is an updated version of the ARO deduplication logic
        -- written to accommodate records without audit log entries

        -- Create temporary table for dupe_aro_pairs which is used to create
        -- dup_aro_sets for DML work and also to use in the "before-after" test
        DROP TABLE IF EXISTS dupe_aro_pairs;
        CREATE TEMP TABLE dupe_aro_pairs
        AS
        SELECT
          "activityReportId" arid,
          "objectiveId" oid
        FROM "ActivityReportObjectives"
        GROUP BY 1,2
        HAVING COUNT(id) > 1
        ;

        -- Create temporary table for dup_aro_sets which is used
        -- in the DML change logic
        DROP TABLE IF EXISTS temp_dup_aro_sets;
        CREATE TEMP TABLE temp_dup_aro_sets
        AS
        WITH dupe_aros AS (
        SELECT
          arid,
          oid,
          id aroid,
          "createdAt" createtime,
          "updatedAt" updatetime
        FROM "ActivityReportObjectives"
        JOIN dupe_aro_pairs
          ON "activityReportId" = arid
          AND "objectiveId" = oid
        )
        SELECT
          arid "activityReportId",
          oid "objectiveId",
          min(COALESCE(zaro.dml_timestamp, createtime)) "min_dml_timestamp",
          max(COALESCE(zaro.dml_timestamp, updatetime)) "max_dml_timestamp",
          COUNT(zaro.id) "count_id",
          array_agg(aroid ORDER BY zaro.data_id ASC) "aroIds"
        FROM dupe_aros
        LEFT JOIN "ZALActivityReportObjectives" zaro
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
          COALESCE(new_row_data->>'ttaProvided',"ttaProvided") ttap,
          das."aroIds"[1] dest_aroid,
          MAX(LENGTH(COALESCE(new_row_data->>'ttaProvided',"ttaProvided"))) OVER (PARTITION BY aro."activityReportId", aro."objectiveId") maxlength,
          zaro.id zaroid
        FROM temp_dup_aro_sets das
        JOIN "ActivityReportObjectives" aro
          ON aro.id = ANY("aroIds")
        LEFT JOIN "ZALActivityReportObjectives" zaro
          ON zaro.data_id = aro.id
          AND new_row_data->'ttaProvided' IS NOT NULL
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

        -- Prepare additional test to make sure there are no duplicates remaining
        DROP TABLE IF EXISTS dupe_aro_pairs_after;
        CREATE TEMP TABLE dupe_aro_pairs_after
        AS
        SELECT
          "activityReportId" arid,
          "objectiveId" oid
        FROM "ActivityReportObjectives"
        GROUP BY 1,2
        HAVING COUNT(id) > 1
        ;

        -- Manual check
        SELECT 1, 'starting pairs', COUNT(*) FROM dupe_aro_pairs
        UNION
        SELECT 2, 'ending pairs', COUNT(*) FROM dupe_aro_pairs_after
        ORDER BY 1;

        -- Fails the transaction with
        -- ERROR:  division by zero
        -- if any dupe pairs remain
        SELECT 1/ (LEAST(1,(SELECT COUNT(*) FROM dupe_aro_pairs_after)) - 1);
      `);
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "activity_report_objectives_activity_report_id_objective_id";
        CREATE UNIQUE INDEX  "activity_report_objectives_activity_report_id_objective_id_unique" ON "ActivityReportObjectives" ("activityReportId","objectiveId");
       `, { transaction });
    });
  },

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "activity_report_objectives_activity_report_id_objective_id_unique";
        CREATE INDEX "activity_report_objectives_activity_report_id_objective_id" ON "ActivityReportObjectives" ("activityReportId","objectiveId");
      `, { transaction });
    },
  ),
};
