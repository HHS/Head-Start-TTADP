const { prepMigration, removeTables } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(/* sql */`
        -- Drop temporary tables if they exist
        DROP TABLE IF EXISTS temp_dup_aro_sets;
        DROP TABLE IF EXISTS temp_reduced_arot;
        DROP TABLE IF EXISTS temp_reduced_aroc;
        DROP TABLE IF EXISTS temp_reduced_arof;
        DROP TABLE IF EXISTS temp_reduced_aror;
        DROP TABLE IF EXISTS temp_reduced_aro;

        -- Create temporary table for dup_aro_sets
        CREATE TEMP TABLE temp_dup_aro_sets AS
        SELECT
          (new_row_data ->> 'activityReportId')::int "activityReportId",
          (new_row_data ->> 'objectiveId')::int "objectiveId",
          min(dml_timestamp) "min_dml_timestamp",
          max(dml_timestamp) "max_dml_timestamp",
          COUNT(zaro.id) "count_id",
          array_agg(zaro.data_id ORDER BY zaro.data_id ASC) "aroIds",
          array_agg(DISTINCT zd.descriptor) "descriptors"
        FROM "ZALActivityReportObjectives" zaro
        JOIN "ZADescriptor" zd
        ON zaro.descriptor_id = zd.id
        WHERE dml_type = 'INSERT'
        GROUP BY 1,2
        HAVING COUNT(zaro.id) > 1
        AND array_position(array_agg(DISTINCT zd.descriptor), 'uploadHandler') IS NOT NULL
        ORDER BY 3 DESC;

        -- Create temporary table for reduced_arot
        CREATE TEMP TABLE temp_reduced_arot AS
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

        -- MERGE operation using temp_reduced_arot
        MERGE INTO "ActivityReportObjectiveTopics" AS target
        USING temp_reduced_arot AS source
        ON (target."activityReportObjectiveId" = source."activityReportObjectiveId"
          AND target."topicId" = source."topicId")
        WHEN MATCHED THEN
            UPDATE SET
            "createdAt" = source."createdAt",
            "updatedAt" = source."updatedAt"
        WHEN NOT MATCHED THEN
            INSERT (
            "activityReportObjectiveId",
            "topicId",
            "createdAt",
            "updatedAt"
          )
            VALUES (
            source."activityReportObjectiveId",
            source."topicId",
            source."createdAt",
            source."updatedAt"
          );

        -- Separate DELETE operation for temp_reduced_arot
        DELETE FROM "ActivityReportObjectiveTopics" t
        USING temp_reduced_arot r
        WHERE t."topicId" = r."topicId"
        AND t.id = ANY (r.ids)
        AND t."activityReportObjectiveId" != r."activityReportObjectiveId";

        -- Create temporary table for reduced_aroc
        CREATE TEMP TABLE temp_reduced_aroc AS
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

        -- MERGE operation using temp_reduced_aroc
        MERGE INTO "ActivityReportObjectiveCourses" AS target
        USING temp_reduced_aroc AS source
        ON (target."activityReportObjectiveId" = source."activityReportObjectiveId"
          AND target."courseId" = source."courseId")
        WHEN MATCHED THEN
            UPDATE SET
            "createdAt" = source."createdAt",
            "updatedAt" = source."updatedAt"
        WHEN NOT MATCHED THEN
            INSERT (
            "activityReportObjectiveId",
            "courseId",
            "createdAt",
            "updatedAt"
          )
            VALUES (
            source."activityReportObjectiveId",
            source."courseId",
            source."createdAt",
            source."updatedAt"
          );

        -- Separate DELETE operation for temp_reduced_aroc
        DELETE FROM "ActivityReportObjectiveCourses" c
        USING temp_reduced_aroc r
        WHERE c."courseId" = r."courseId"
        AND c.id = ANY (r.ids)
        AND c."activityReportObjectiveId" != r."activityReportObjectiveId";

        -- Create temporary table for reduced_arof
        CREATE TEMP TABLE temp_reduced_arof AS
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

        -- MERGE operation using temp_reduced_arof
        MERGE INTO "ActivityReportObjectiveFiles" AS target
        USING temp_reduced_arof AS source
        ON (target."activityReportObjectiveId" = source."activityReportObjectiveId"
          AND target."fileId" = source."fileId")
        WHEN MATCHED THEN
            UPDATE SET
            "createdAt" = source."createdAt",
            "updatedAt" = source."updatedAt"
        WHEN NOT MATCHED THEN
            INSERT (
            "activityReportObjectiveId",
            "fileId",
            "createdAt",
            "updatedAt"
          )
            VALUES (
            source."activityReportObjectiveId",
            source."fileId",
            source."createdAt",
            source."updatedAt"
          );

        -- Separate DELETE operation for temp_reduced_arof
        DELETE FROM "ActivityReportObjectiveFiles" f
        USING temp_reduced_arof r
        WHERE f."fileId" = r."fileId"
        AND f.id = ANY (r.ids)
        AND f."activityReportObjectiveId" != r."activityReportObjectiveId";

        -- Create temporary table for reduced_aror
        CREATE TEMP TABLE temp_reduced_aror AS
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

        -- MERGE operation using temp_reduced_aror
        MERGE INTO "ActivityReportObjectiveResources" AS target
        USING temp_reduced_aror AS source
        ON (target."activityReportObjectiveId" = source."activityReportObjectiveId"
          AND target."resourceId" = source."resourceId")
        WHEN MATCHED THEN
            UPDATE SET
            "createdAt" = source."createdAt",
            "updatedAt" = source."updatedAt"
        WHEN NOT MATCHED THEN
            INSERT (
            "activityReportObjectiveId",
            "resourceId",
            "createdAt",
            "updatedAt"
          )
            VALUES (
            source."activityReportObjectiveId",
            source."resourceId",
            source."createdAt",
            source."updatedAt"
          );

        -- Separate DELETE operation for temp_reduced_aror
        DELETE FROM "ActivityReportObjectiveResources" r
        USING temp_reduced_aror t
        WHERE r."resourceId" = t."resourceId"
        AND r.id = ANY (t.ids)
        AND r."activityReportObjectiveId" != t."activityReportObjectiveId";

        -- Create temporary table for reduced_aro
        CREATE TEMP TABLE temp_reduced_aro AS
        SELECT
          das."activityReportId",
          das."objectiveId",
          das."aroIds"[1] id,
          MIN(aro."createdAt") "createdAt",
          MAX(aro."updatedAt") "updatedAt",
          (ARRAY_AGG(aro."ttaProvided" ORDER BY LENGTH(aro."ttaProvided") DESC))[1] "ttaProvided",
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
          array_agg(aro.id) "aroIds"
        FROM temp_dup_aro_sets das
        JOIN "ActivityReportObjectives" aro
        ON aro.id = ANY (das."aroIds")
        GROUP BY 1,2;

        -- MERGE operation using temp_reduced_aro
        MERGE INTO "ActivityReportObjectives" AS target
        USING temp_reduced_aro AS source
        ON (target.id = source.id
          AND target."objectiveId" = source."objectiveId"
          AND target."activityReportId" = source."activityReportId")
        WHEN MATCHED THEN
            UPDATE SET
                "createdAt" = source."createdAt",
                "updatedAt" = source."updatedAt",
                "ttaProvided" = source."ttaProvided",
                "title" = source."title",
                "status" = source."status",
                "arOrder" = source."arOrder",
                "closeSuspendReason" = source."closeSuspendReason",
                "closeSuspendContext" = source."closeSuspendContext",
                "originalObjectiveId" = source."originalObjectiveId",
                "supportType" = source."supportType",
                "objectiveCreatedHere" = source."objectiveCreatedHere"
        WHEN NOT MATCHED THEN
            INSERT (
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
            VALUES (
            source."activityReportId",
            source."objectiveId",
            source.id,
            source."createdAt",
            source."updatedAt",
            source."ttaProvided",
            source."title",
            source."status",
            source."arOrder",
            source."closeSuspendReason",
            source."closeSuspendContext",
            source."originalObjectiveId",
            source."supportType",
            source."objectiveCreatedHere"
          );

        -- Separate DELETE operation for temp_reduced_aro
        DELETE FROM "ActivityReportObjectives" o
        USING temp_reduced_aro r
        WHERE o."objectiveId" = r."objectiveId"
        AND o."activityReportId" = r."activityReportId"
        AND o.id = ANY (ARRAY_REMOVE(r."aroIds",r."aroIds"[1]));

        -- Drop temporary tables at the end
        DROP TABLE IF EXISTS temp_dup_aro_sets;
        DROP TABLE IF EXISTS temp_reduced_arot;
        DROP TABLE IF EXISTS temp_reduced_aroc;
        DROP TABLE IF EXISTS temp_reduced_arof;
        DROP TABLE IF EXISTS temp_reduced_aror;
        DROP TABLE IF EXISTS temp_reduced_aro;
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
