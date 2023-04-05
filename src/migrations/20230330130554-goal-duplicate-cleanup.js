module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      try {
        // Delete duplicate goals based on trimmed_hashes, keeping the one with the lowest id
        await queryInterface.sequelize.query(`
        -- Collect Pre Count Stats
        --todo list: counts by region pre & post ()
        CREATE TEMP TABLE "PreCountStats" AS (
            SELECT
            'PreCountStats' "table",
            (SELECT COUNT(*) FROM "Goals" g) "GoalsTotal",
            (SELECT COUNT(*) FROM "ActivityReportGoals" arg) "ActivityReportGoalsTotal",
            (SELECT COUNT(*) FROM "ActivityReportGoalResources"argr) "ActivityReportGoalResourcesTotal",
            (SELECT COUNT(*) FROM "Objectives" oj) "ObjectivesTotal",
            (SELECT COUNT(*) FROM "ObjectiveFiles" ojf) "ObjectiveFilesTotal",
            (SELECT COUNT(*) FROM "ObjectiveResources" ojr) "ObjectiveResourcesTotal",
            (SELECT COUNT(*) FROM "ObjectiveTopics" ojt) "ObjectiveTopicsTotal",
            (SELECT COUNT(*) FROM "ActivityReportObjectives" aro) "ActivityReportObjectivesTotal",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveFiles" arof) "ActivityReportObjectiveFilesTotal",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveResources" aror) "ActivityReportObjectiveResourcesTotal",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveTopics" arot) "ActivityReportObjectiveTopicsTotal"
        );

        -- CREATE TABLE "DupGoalsOnARs" AS (
        CREATE TEMP TABLE "DupGoalsOnARs" AS (
            SELECT
            array_remove(ARRAY_AGG(DISTINCT arg."activityReportId"), NULL) "activityReportIds",
            g."grantId",
            COALESCE(gt."hash",MD5(TRIM(g.name))) "goalHash",
            ARRAY_AGG(DISTINCT g.id ORDER BY g.id) "goalIds",
            COUNT(DISTINCT g.id) "goalCnt",
            g."status" = 'Closed' "statusClosed"
            FROM "Goals" g
            LEFT JOIN "ActivityReportGoals" arg
            ON arg."goalId" = g.id
            LEFT JOIN "GoalTemplates" gt
            ON g."goalTemplateId" = gt.id
            GROUP BY 2,3,6
            HAVING ARRAY_LENGTH(ARRAY_AGG(g.id ORDER BY g.id), 1) > 1
            ORDER BY 5 DESC
        );
        -- CREATE TABLE "GoalsToModify" AS (
        CREATE TEMP TABLE "GoalsToModify" AS (
            SELECT DISTINCT
            g2."grantId",
            g.name,
            dgoa."goalHash",
            CASE
                WHEN 'Closed' = ANY(ARRAY_AGG(g."status"))
                OR 'Closed' = ANY(ARRAY_AGG(g2."status"))
                THEN 'Closed'
                WHEN 'Suspended' = ANY(ARRAY_AGG(g."status"))
                OR 'Suspended' = ANY(ARRAY_AGG(g2."status"))
                THEN 'Suspended'
                WHEN 'In Progress' = ANY(ARRAY_AGG(g."status"))
                OR 'In Progress' = ANY(ARRAY_AGG(g2."status"))
                THEN 'In Progress'
                WHEN 'Not Started' = ANY(ARRAY_AGG(g."status"))
                OR 'Not Started' = ANY(ARRAY_AGG(g2."status"))
                THEN 'Not Started'
                WHEN 'Draft' = ANY(ARRAY_AGG(g."status"))
                OR 'Draft' = ANY(ARRAY_AGG(g2."status"))
                THEN 'Draft'
                ELSE COALESCE((ARRAY_AGG(g2."status"))[1], 'Not Started')
            END "status",
            (ARRAY_AGG(COALESCE(g2.timeframe, g.timeframe)))[1] timeframe,
            BOOL_OR(g2."isFromSmartsheetTtaPlan" OR g."isFromSmartsheetTtaPlan") "isFromSmartsheetTtaPlan",
            MIN(LEAST(g2."createdAt",g."createdAt")) "createdAt",
            MAX(GREATEST(g2."updatedAt", g."updatedAt")) "updatedAt",
            g2."closeSuspendReason",
            g2."closeSuspendContext",
            MAX(GREATEST(g2."endDate", g."endDate")) "endDate",
            CASE
                WHEN 'Closed' = ANY(ARRAY_AGG(g."previousStatus"))
                OR 'Closed' = ANY(ARRAY_AGG(g2."previousStatus"))
                THEN 'Closed'
                WHEN 'Suspended' = ANY(ARRAY_AGG(g."previousStatus"))
                OR 'Suspended' = ANY(ARRAY_AGG(g2."previousStatus"))
                THEN 'Suspended'
                WHEN 'In Progress' = ANY(ARRAY_AGG(g."previousStatus"))
                OR 'In Progress' = ANY(ARRAY_AGG(g2."previousStatus"))
                THEN 'In Progress'
                WHEN 'Not Started' = ANY(ARRAY_AGG(g."previousStatus"))
                OR 'Not Started' = ANY(ARRAY_AGG(g2."previousStatus"))
                THEN 'Not Started'
                WHEN 'Draft' = ANY(ARRAY_AGG(g."previousStatus"))
                OR 'Draft' = ANY(ARRAY_AGG(g2."previousStatus"))
                THEN 'Draft'
                ELSE COALESCE((ARRAY_AGG(g2."previousStatus"))[1], 'Not Started')
            END "previousStatus",
            MIN(g."goalTemplateId") "goalTemplateId",
            BOOL_OR(COALESCE(g2."onApprovedAR", FALSE) OR g."onApprovedAR") "onApprovedAR",
            MIN(LEAST(g2."firstNotStartedAt", g."firstNotStartedAt")) "firstNotStartedAt",
            MAX(GREATEST(g2."lastNotStartedAt", g."lastNotStartedAt")) "lastNotStartedAt",
            MIN(LEAST(g2."firstInProgressAt", g."firstInProgressAt")) "firstInProgressAt",
            MAX(GREATEST(g2."lastInProgressAt", g."lastInProgressAt")) "lastInProgressAt",
            MIN(LEAST(g2."firstCeasedSuspendedAt", g."firstCeasedSuspendedAt")) "firstCeasedSuspendedAt",
            MAX(GREATEST(g2."lastCeasedSuspendedAt", g."lastCeasedSuspendedAt")) "lastCeasedSuspendedAt",
            MIN(LEAST(g2."firstClosedAt", g."firstClosedAt")) "firstClosedAt",
            MAX(GREATEST(g2."lastClosedAt", g."lastClosedAt")) "lastClosedAt",
            MIN(LEAST(g2."firstCompletedAt", g."firstCompletedAt")) "firstCompletedAt",
            MAX(GREATEST(g2."lastCompletedAt", g."lastCompletedAt")) "lastCompletedAt",
            CASE
                WHEN 'imported' = ANY(ARRAY_AGG(g."createdVia"))
                OR 'imported' = ANY(ARRAY_AGG(g2."createdVia"))
                THEN 'imported'
                WHEN 'rtr' = ANY(ARRAY_AGG(g."createdVia"))
                OR 'rtr' = ANY(ARRAY_AGG(g2."createdVia"))
                THEN 'rtr'
                WHEN 'activityReport' = ANY(ARRAY_AGG(g."createdVia"))
                OR 'activityReport' = ANY(ARRAY_AGG(g2."createdVia"))
                THEN 'activityReport'
            END "createdVia",
            CASE
                WHEN 'Yes' = ANY(ARRAY_AGG(g."isRttapa"))
                OR 'Yes' = ANY(ARRAY_AGG(g2."isRttapa"))
                THEN 'Yes'
                WHEN 'No' = ANY(ARRAY_AGG(g."isRttapa"))
                OR 'No' = ANY(ARRAY_AGG(g2."isRttapa"))
                THEN 'No'
            END "isRttapa",
            BOOL_OR(COALESCE(g2."onAR", FALSE) OR g."onAR") "onAR",
            ARRAY_AGG(DISTINCT "g".id ORDER by "g".id) "toRemove",
            (ARRAY_AGG(DISTINCT "g2".id))[1] "toUpdate"
            FROM "Goals" g
            JOIN "DupGoalsOnARs" dgoa
            ON g.id = ANY(dgoa."goalIds")
            AND g.id != dgoa."goalIds"[1]
            JOIN "Goals" g2
            ON g2.id = dgoa."goalIds"[1]
            AND g."grantId" = dgoa."grantId"
            AND MD5(TRIM(g.name)) = MD5(TRIM(g2.name))
            GROUP BY 1,2,3,9,10
        );

        -- All objectives that are duplicates on goals that are duplicates on the same AR
        CREATE TEMP TABLE "DupObjectivesOnDupGoalsOnARs" AS (
            SELECT
            dgoa.*,
            COALESCE(ot."hash",MD5(TRIM(o.title))) "objectiveHash",
            ARRAY_AGG(o.id ORDER BY o.id) "objectiveIds",
            COUNT(DISTINCT o.id) "objectiveCnt"
            FROM "Objectives" o
            JOIN "DupGoalsOnARs" dgoa
            ON o."goalId" = ANY(dgoa."goalIds")
            LEFT JOIN "ObjectiveTemplates" ot
            ON o."objectiveTemplateId" = ot.id
            GROUP BY 1,2,3,4,5,6,7
            HAVING ARRAY_LENGTH(ARRAY_AGG(o.id ORDER BY o.id), 1) > 1
            ORDER BY 8 DESC
        );

        -- All objectives that are duplicates on goals that are not duplicates on the same AR
        CREATE TEMP TABLE "DupObjectivesOnNonDupGoalsOnARs" AS (
            SELECT DISTINCT
            array_remove(ARRAY_AGG(DISTINCT aro."activityReportId"), NULL) "activityReportIds",
            g."grantId",
            MD5(TRIM(g.name)) "goalHash",
            ARRAY[g.id] "goalIds",
            1 "goalCnt",
            g."status" = 'Closed' "statusClosed",
            COALESCE(ot."hash",MD5(TRIM(o.title))) "objectiveHash",
            ARRAY_AGG(o.id ORDER BY o.id) "objectiveIds",
            COUNT(DISTINCT o.id) "objectiveCnt"
            FROM "Objectives" o
            LEFT JOIN "ActivityReportObjectives" aro
            ON aro."objectiveId" = o.id
            LEFT JOIN "ObjectiveTemplates" ot
            ON o."objectiveTemplateId" = ot.id
            JOIN "Goals" g
            ON o."goalId" = g.id
            LEFT JOIN "DupObjectivesOnDupGoalsOnARs" doodgoa
            ON aro."activityReportId" = ANY(doodgoa."activityReportIds")
            AND g."grantId" = doodgoa."grantId"
            AND MD5(TRIM(g.name)) = doodgoa."goalHash"
            AND COALESCE(ot."hash",MD5(TRIM(o.title))) = doodgoa."objectiveHash"
            AND o.id != ANY(doodgoa."objectiveIds")
            WHERE doodgoa."grantId" IS NULL
            GROUP BY 2,3,4,5,6,7
            HAVING ARRAY_LENGTH(ARRAY_AGG(o.id ORDER BY o.id), 1) > 1
            ORDER BY 8 DESC
        );
        -- All objectives that are duplicates on goals that are (not) duplicates on the same AR
        CREATE TEMP TABLE "DupObjectivesOnARs" AS (
            SELECT
            *
            FROM "DupObjectivesOnDupGoalsOnARs"
            UNION
            SELECT
            *
            FROM "DupObjectivesOnNonDupGoalsOnARs"
        );
        -- Handle Objectives
        CREATE TEMP TABLE "ObjectivesToModify" AS (
            SELECT DISTINCT
            (dooa."goalIds")[1] "goalId",
            COALESCE(o2."title", o."title") "title",
            dooa."objectiveHash",
            CASE
                WHEN 'Complete' = ANY(ARRAY_AGG(o."status"))
                OR 'Complete' = ANY(ARRAY_AGG(o2."status"))
                THEN 'Complete'
                WHEN 'Suspended' = ANY(ARRAY_AGG(o."status"))
                OR 'Suspended' = ANY(ARRAY_AGG(o2."status"))
                THEN 'Suspended'
                WHEN 'In Progress' = ANY(ARRAY_AGG(o."status"))
                OR 'In Progress' = ANY(ARRAY_AGG(o2."status"))
                THEN 'In Progress'
                WHEN 'Not Started' = ANY(ARRAY_AGG(o."status"))
                OR 'Not Started' = ANY(ARRAY_AGG(o2."status"))
                THEN 'Not Started'
                ELSE COALESCE((ARRAY_AGG(o2."status"))[1], 'Not Started')
            END "status",
            MIN(LEAST("o"."createdAt", "o2"."createdAt")) "createdAt",
            MAX(GREATEST("o"."updatedAt", "o2"."updatedAt")) "updatedAt",
            COALESCE(o2."otherEntityId", o."otherEntityId") "otherEntityId",
            BOOL_OR(o."onApprovedAR" OR COALESCE(o2."onApprovedAR", FALSE)) "onApprovedAR",
            MIN(LEAST("o"."firstNotStartedAt", "o2"."firstNotStartedAt")) "firstNotStartedAt",
            MAX(GREATEST("o"."lastNotStartedAt", "o2"."lastNotStartedAt")) "lastNotStartedAt",
            MIN(LEAST("o"."firstInProgressAt", "o2"."firstInProgressAt")) "firstInProgressAt",
            MAX(GREATEST("o"."lastInProgressAt", "o2"."lastInProgressAt")) "lastInProgressAt",
            MIN(LEAST("o"."firstCompleteAt", "o2"."firstCompleteAt")) "firstCompleteAt",
            MAX(GREATEST("o"."lastCompleteAt", "o2"."lastCompleteAt")) "lastCompleteAt",
            MIN(LEAST("o"."firstSuspendedAt", "o2"."firstSuspendedAt")) "firstSuspendedAt",
            MAX(GREATEST("o"."lastSuspendedAt", "o2"."lastSuspendedAt")) "lastSuspendedAt",
            MIN(LEAST(o."rtrOrder", o2."rtrOrder")) "rtrOrder",
            CASE
                WHEN 'rtr' = ANY(ARRAY_AGG(o."createdVia"))
                OR 'rtr' = ANY(ARRAY_AGG(o2."createdVia"))
                THEN 'rtr'
                WHEN 'activityReport' = ANY(ARRAY_AGG(o."createdVia"))
                OR 'activityReport' = ANY(ARRAY_AGG(o2."createdVia"))
                THEN 'activityReport'
                ELSE NULL
            END "createdVia",
            BOOL_OR(o."onAR" OR COALESCE(o2."onAR", FALSE)) "onAR",
            ARRAY_AGG(DISTINCT "o".id ORDER by "o".id) "toRemove",
            (ARRAY_AGG(DISTINCT "o2".id))[1] "toUpdate"
            FROM "Objectives" o
            JOIN "DupObjectivesOnARs" dooa
            ON o.id = ANY(dooa."objectiveIds")
            AND o.id != dooa."objectiveIds"[1]
            LEFT JOIN "Objectives" o2
            ON o2.id != dooa."objectiveIds"[1]
            AND o."goalId" = o2."goalId"
            GROUP BY 1,2,3,7
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertObjectives', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertObjectives" AS
        CREATE TEMP TABLE "InsertObjectives" AS
        WITH inserted_objectives  AS (
            INSERT INTO "Objectives"
            (
            "goalId",
            "title",
            status,
            "createdAt",
            "updatedAt",
            "otherEntityId",
            "onAR",
            "onApprovedAR",
            "firstNotStartedAt",
            "lastNotStartedAt",
            "firstInProgressAt",
            "lastInProgressAt",
            "firstCompleteAt",
            "lastCompleteAt",
            "firstSuspendedAt",
            "lastSuspendedAt",
            "rtrOrder",
            "createdVia"
            )
            SELECT
            "goalId",
            "title",
            status,
            "createdAt",
            "updatedAt",
            "otherEntityId",
            "onAR",
            "onApprovedAR",
            "firstNotStartedAt",
            "lastNotStartedAt",
            "firstInProgressAt",
            "lastInProgressAt",
            "firstCompleteAt",
            "lastCompleteAt",
            "firstSuspendedAt",
            "lastSuspendedAt",
            "rtrOrder",
            "createdVia"::"enum_Objectives_createdVia"
            FROM "ObjectivesToModify" otm
            WHERE otm."toUpdate" IS NULL
            RETURNING
                id "objectiveId",
                "goalId",
                MD5(TRIM("title")) "objectiveHash"
        )
        SELECT * FROM inserted_objectives;
        END;
        -- Handle ActivityReportObjectives Metadata tables
        CREATE TEMP TABLE "ObjectivesToModifyMetadata" AS
        WITH objectives_to_modify AS (
            SELECT
            otm."goalId",
            otm."title",
            otm.status,
            otm."createdAt",
            otm."updatedAt",
            otm."otherEntityId",
            otm."onAR",
            otm."onApprovedAR",
            otm."firstNotStartedAt",
            otm."lastNotStartedAt",
            otm."firstInProgressAt",
            otm."lastInProgressAt",
            otm."firstCompleteAt",
            otm."lastCompleteAt",
            otm."firstSuspendedAt",
            otm."lastSuspendedAt",
            otm."rtrOrder",
            otm."createdVia",
            otm."toRemove",
            COALESCE(otm."toUpdate", "io"."objectiveId") "toUpdate"
            FROM "ObjectivesToModify" otm
            LEFT JOIN "InsertObjectives" "io"
            ON otm."goalId" = "io"."goalId"
            AND otm."objectiveHash" = "io"."objectiveHash"
        )
        SELECT * FROM objectives_to_modify;

        -- Handle ObjectiveFiles
        CREATE TEMP TABLE "ObjectiveFilesToModify" AS (
            SELECT
            otmm."toUpdate" "objectiveId",
            "of"."fileId",
            MIN(LEAST("of"."createdAt", "of2"."createdAt")) "createdAt",
            MAX(GREATEST("of"."updatedAt", "of2"."updatedAt")) "updatedAt",
            BOOL_OR("of"."onAR" OR COALESCE("of2"."onAR", FALSE)) "onAR",
            BOOL_OR("of"."onApprovedAR" OR COALESCE("of2"."onApprovedAR", FALSE)) "onApprovedAR",
            ARRAY_AGG(DISTINCT "of".id ORDER by "of".id) "toRemove" ,
            (ARRAY_AGG(DISTINCT "of2".id))[1] "toUpdate"
            FROM "ObjectiveFiles" "of"
            JOIN "ObjectivesToModifyMetadata" otmm
            ON "of"."objectiveId" = ANY(otmm."toRemove")
            LEFT JOIN "ObjectiveFiles" "of2"
            ON "of2"."objectiveId" = otmm."toUpdate"
            AND "of"."fileId" = "of2"."fileId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertObjectivesFiles', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertObjectiveFiles" AS 
        CREATE TEMP TABLE "InsertObjectiveFiles" AS 
         WITH objective_files AS (
            INSERT INTO "ObjectiveFiles"
            (
            "objectiveId",
            "fileId",
            "createdAt",
            "updatedAt",
            "onAR",
            "onApprovedAR"
            )
            SELECT
            "objectiveId",
            "fileId",
            "createdAt",
            "updatedAt",
            "onAR",
            "onApprovedAR"
            FROM "ObjectiveFilesToModify" oftm
            WHERE oftm."toUpdate" IS NULL
            RETURNING
            id "objectiveFileId",
            "objectiveId"
        )
        SELECT * FROM objective_files;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateObjectiveFiles', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateObjectiveFiles" AS
        CREATE TEMP TABLE "UpdateObjectiveFiles" AS
        WITH update_objective_files AS  (
            UPDATE "ObjectiveFiles" "of"
            SET
            "createdAt" = oftm."createdAt",
            "updatedAt" = oftm."updatedAt",
            "onAR" = oftm."onAR",
            "onApprovedAR" = oftm."onApprovedAR"
            FROM "ObjectiveFilesToModify" oftm
            WHERE "of".id = oftm."toUpdate"
            AND (
              "of"."createdAt" != oftm."createdAt"
              OR "of"."updatedAt" != oftm."updatedAt"
              OR "of"."onAR" != oftm."onAR"
              OR "of"."onApprovedAR" != oftm."onApprovedAR"
            )
            RETURNING
            "of".id "objectiveFileId",
            "of"."objectiveId"
        )
        SELECT * FROM update_objective_files;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteObjectiveFiles', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteObjectiveFiles" AS
        CREATE TEMP TABLE "DeleteObjectiveFiles" AS
        WITH del_objective_files AS (
            DELETE FROM "ObjectiveFiles" "of"
            USING "ObjectiveFilesToModify" oftm
            WHERE "of".id = ANY(oftm."toRemove")
            RETURNING
            "of".id "objectiveFileId",
            "of"."objectiveId"
        )
        SELECT * FROM del_objective_files;

        -- CREATE TABLE "ObjectiveFileStats" AS (
        CREATE TEMP TABLE "ObjectiveFileStats" AS (
            SELECT
            'ObjectiveFiles' "table",
            (SELECT COUNT(*) FROM "InsertObjectiveFiles") "Inserts",
            (SELECT COUNT(*) FROM "UpdateObjectiveFiles") "Updates",
            (SELECT COUNT(*) FROM "DeleteObjectiveFiles") "Deletes",
            (SELECT COUNT(*) FROM "ObjectiveFiles") "post_count"
        );
        -- Handle ObjectiveResources

        CREATE TEMP TABLE "ObjectiveResourcesToModify" AS (
            SELECT
            otmm."toUpdate" "objectiveId",
            "or"."resourceId",
            (
                SELECT ARRAY_AGG(DISTINCT sfx."sourceField")
                FROM "ObjectiveResources" "orx"
                CROSS JOIN UNNEST("orx"."sourceFields") sfx("sourceField")
                WHERE "or"."resourceId" = orx."resourceId"
                AND (orx."objectiveId" = ANY(ARRAY_AGG("or"."objectiveId"))
                OR otmm."toUpdate" = orx."objectiveId")
            ) "sourceFields",
            MIN(LEAST("or"."createdAt", "or2"."createdAt")) "createdAt",
            MAX(GREATEST("or"."updatedAt", "or2"."updatedAt")) "updatedAt",
            BOOL_OR("or"."onAR" OR COALESCE("or2"."onAR", FALSE)) "onAR",
            BOOL_OR("or"."onApprovedAR" OR COALESCE("or2"."onApprovedAR", FALSE)) "onApprovedAR",
            ARRAY_AGG(DISTINCT "or".id ORDER by "or".id) "toRemove",
            (ARRAY_AGG(DISTINCT "or2".id))[1] "toUpdate"
            FROM "ObjectiveResources" "or"
            JOIN "ObjectivesToModifyMetadata" otmm
            ON "or"."objectiveId" = ANY(otmm."toRemove")
            LEFT JOIN "ObjectiveResources" "or2"
            ON "or2"."objectiveId" = otmm."toUpdate"
            AND "or"."resourceId" = "or2"."resourceId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertObjectiveResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertObjectiveResources" AS
        CREATE TEMP TABLE "InsertObjectiveResources" AS
            WITH  insert_objective_resources AS (
                INSERT INTO "ObjectiveResources"
                (
                "objectiveId",
                "resourceId",
                "sourceFields",
                "createdAt",
                "updatedAt",
                "onAR",
                "onApprovedAR"
                )
                SELECT
                "objectiveId",
                "resourceId",
                "sourceFields",
                "createdAt",
                "updatedAt",
                "onAR",
                "onApprovedAR"
                FROM "ObjectiveResourcesToModify" ortm
                WHERE ortm."toUpdate" IS NULL
                RETURNING
                id "objectiveResourceId",
                "objectiveId"
            )
        SELECT * FROM insert_objective_resources;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateObjectiveResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateObjectiveResources" AS
        CREATE TEMP TABLE "UpdateObjectiveResources" AS
            WITH update_objective_resources AS (
                UPDATE "ObjectiveResources" "or"
                SET
                "sourceFields" = ortm."sourceFields",
                "createdAt" = ortm."createdAt",
                "updatedAt" = ortm."updatedAt",
                "onAR" = ortm."onAR",
                "onApprovedAR" = ortm."onApprovedAR"
                FROM "ObjectiveResourcesToModify" ortm
                WHERE "or".id = ortm."toUpdate"
                AND (
                  "or"."sourceFields" != ortm."sourceFields"
                  OR "or"."createdAt" != ortm."createdAt"
                  OR "or"."updatedAt" != ortm."updatedAt"
                  OR "or"."onAR" != ortm."onAR"
                  OR "or"."onApprovedAR" != ortm."onApprovedAR"
                )
                RETURNING
                "or".id "objectiveResourceId",
                "or"."objectiveId"
            )
        SELECT * FROM update_objective_resources;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteObjectiveResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteObjectiveResources" AS
        CREATE TEMP TABLE "DeleteObjectiveResources" AS
            WITH delete_objective_resources AS
            (
                DELETE FROM "ObjectiveResources" "or"
                USING "ObjectiveResourcesToModify" ortm
                WHERE "or".id = ANY(ortm."toRemove")
                RETURNING
                "or".id "objectiveResourceId",
                "or"."objectiveId"
            )
        SELECT * FROM delete_objective_resources;
        END;

        -- CREATE TABLE "ObjectiveResourceStats" AS
        CREATE TEMP TABLE "ObjectiveResourceStats" AS
            (
                SELECT
                'ObjectiveResources' "table",
                (SELECT COUNT(*) FROM "InsertObjectiveResources") "Inserts",
                (SELECT COUNT(*) FROM "UpdateObjectiveResources") "Updates",
                (SELECT COUNT(*) FROM "DeleteObjectiveResources") "Deletes",
                (SELECT COUNT(*) FROM "ObjectiveResources" "or") "post_count"
            );

        -- Handle ObjectiveTopics

        CREATE TEMP TABLE "ObjectiveTopicsToModify" AS (
            SELECT
            otmm."toUpdate" "objectiveId",
            "ot"."topicId",
            MIN(LEAST("ot"."createdAt", "ot2"."createdAt")) "createdAt",
            MAX(GREATEST("ot"."updatedAt", "ot2"."updatedAt")) "updatedAt",
            BOOL_OR("ot"."onAR" OR COALESCE("ot2"."onAR", FALSE)) "onAR",
            BOOL_OR("ot"."onApprovedAR" OR COALESCE("ot2"."onApprovedAR", FALSE)) "onApprovedAR",
            ARRAY_AGG(DISTINCT "ot".id ORDER by "ot".id) "toRemove",
            (ARRAY_AGG(DISTINCT "ot2".id))[1] "toUpdate"
            FROM "ObjectiveTopics" "ot"
            JOIN "ObjectivesToModifyMetadata" otmm
            ON "ot"."objectiveId" = ANY(otmm."toRemove")
            LEFT JOIN "ObjectiveTopics" "ot2"
            ON "ot2"."objectiveId" = otmm."toUpdate"
            AND "ot"."topicId" = "ot2"."topicId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertObjectiveTopics', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertObjectiveTopics" AS
        CREATE TEMP TABLE "InsertObjectiveTopics" AS
        WITH insert_objective_topics AS (
            INSERT INTO "ObjectiveTopics"
            (
            "objectiveId",
            "topicId",
            "createdAt",
            "updatedAt",
            "onAR",
            "onApprovedAR"
            )
            SELECT
            "objectiveId",
            "topicId",
            "createdAt",
            "updatedAt",
            "onAR",
            "onApprovedAR"
            FROM "ObjectiveTopicsToModify" ottm
            WHERE ottm."toUpdate" IS NULL
            RETURNING
            id "objectiveTopicId",
            "objectiveId"
        )
        SELECT * FROM insert_objective_topics;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateObjectiveTopics', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateObjectiveTopics" AS
        CREATE TEMP TABLE "UpdateObjectiveTopics" AS
        WITH update_objective_topics AS (
            UPDATE "ObjectiveTopics" "ot"
            SET
            "createdAt" = ottm."createdAt",
            "updatedAt" = ottm."updatedAt",
            "onAR" = ottm."onAR",
            "onApprovedAR" = ottm."onApprovedAR"
            FROM "ObjectiveTopicsToModify" ottm
            WHERE "ot".id = ottm."toUpdate"
            AND (
              "ot"."createdAt" != ottm."createdAt"
              OR "ot"."updatedAt" != ottm."updatedAt"
              OR "ot"."onAR" != ottm."onAR"
              OR "ot"."onApprovedAR" != ottm."onApprovedAR"
            )
            RETURNING
            "ot".id "objectiveTopicId",
            "ot"."objectiveId"
        )
        SELECT * FROM update_objective_topics;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteObjectiveTopics', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteObjectiveTopics" AS
        CREATE TEMP TABLE "DeleteObjectiveTopics" AS
        WITH delete_objective_topics AS (
            DELETE FROM "ObjectiveTopics" "ot"
            USING "ObjectiveTopicsToModify" ottm
            WHERE "ot".id = ANY(ottm."toRemove")
            RETURNING
            "ot".id "objectiveTopicId",
            "ot"."objectiveId"
        )
        SELECT * FROM delete_objective_topics;
        END;

        -- CREATE TABLE "ObjectiveTopicStats" AS (
        CREATE TEMP TABLE "ObjectiveTopicStats" AS (
            SELECT
            'ObjectiveTopics' "table",
            (SELECT COUNT(*) FROM "InsertObjectiveTopics") "Inserts",
            (SELECT COUNT(*) FROM "UpdateObjectiveTopics") "Updates",
            (SELECT COUNT(*) FROM "DeleteObjectiveTopics") "Deletes",
            (SELECT COUNT(*) FROM "ObjectiveTopics" ot) "post_count"
        );
        -- Handle ActivityReportObjectives
        CREATE TEMP TABLE "ActivityReportObjectivesToModify" AS (
            SELECT
            otmm."toUpdate" "objectiveId",
            aro."activityReportId",
            aro.title,
            aro.status,
            MIN(LEAST(aro."arOrder", aro2."arOrder")) "arOrder",
            (
            SELECT STRING_AGG(DISTINCT "arox"."ttaProvided", E'\n')
            FROM "ActivityReportObjectives" "arox"
            WHERE "aro"."activityReportId" = arox."activityReportId"
            AND (arox."objectiveId" = ANY(ARRAY_AGG("aro"."objectiveId"))
            OR otmm."toUpdate" = arox."objectiveId")
                ) "ttaProvided",
                MIN(LEAST("aro"."createdAt", "aro2"."createdAt")) "createdAt",
                MAX(GREATEST("aro"."updatedAt", "aro2"."updatedAt")) "updatedAt",
                ARRAY_AGG(DISTINCT "aro".id ORDER by "aro".id) "toRemove",
                (ARRAY_AGG(DISTINCT "aro2".id))[1] "toUpdate"
                FROM "ActivityReportObjectives" aro
                JOIN "ObjectivesToModifyMetadata" otmm
                ON "aro"."objectiveId" = ANY(otmm."toRemove")
                LEFT JOIN "ActivityReportObjectives" "aro2"
                ON "aro2"."objectiveId" = otmm."toUpdate"
                AND "aro"."activityReportId" = "aro2"."activityReportId"
                GROUP BY 1,2,3,4
           );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertActivityReportObjectives', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertActivityReportObjectives" AS
        CREATE TEMP TABLE "InsertActivityReportObjectives" AS
        WITH insert_activity_report_objectives AS (
            INSERT INTO "ActivityReportObjectives"
            (
            "objectiveId",
            "activityReportId",
            title,
            status,
            "ttaProvided",
            "arOrder",
            "createdAt",
            "updatedAt"
            )
            SELECT
            "objectiveId",
            "activityReportId",
            title,
            status,
            "ttaProvided",
            "arOrder",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportObjectivesToModify" oftm
            WHERE oftm."toUpdate" IS NULL
            RETURNING
            id "activityReportObjectiveId",
            "objectiveId",
            "activityReportId"
        )
        SELECT * FROM insert_activity_report_objectives;
        END;

        -- Handle ActivityReportObjectives Metadata tables
        CREATE TEMP TABLE "ActivityReportObjectivesToModifyMetadata" AS (
            SELECT
            arotm."objectiveId",
            arotm."activityReportId",
            arotm.title,
            arotm.status,
            arotm."arOrder",
            arotm."ttaProvided",
            arotm."createdAt",
            arotm."updatedAt",
            arotm."toRemove",
            COALESCE(arotm."toUpdate", iaro."activityReportObjectiveId") "toUpdate"
            FROM "ActivityReportObjectivesToModify" arotm
            LEFT JOIN "InsertActivityReportObjectives" iaro
            ON arotm."objectiveId" = iaro."objectiveId"
            AND arotm."activityReportId" = iaro."activityReportId"
        );
        -- Handle ActivityReportObjectiveFiles
        CREATE TEMP TABLE "ActivityReportObjectiveFilesToModify" AS (
            SELECT
            arotmm."toUpdate" "activityReportObjectiveId",
            arof."fileId",
            MIN(LEAST("arof"."createdAt", "arof2"."createdAt")) "createdAt",
            MAX(GREATEST("arof"."updatedAt", "arof2"."updatedAt")) "updatedAt",
            ARRAY_AGG(DISTINCT "arof".id ORDER by "arof".id) "toRemove",
            (ARRAY_AGG(DISTINCT "arof2".id))[1] "toUpdate"
            FROM "ActivityReportObjectiveFiles" arof
            JOIN "ActivityReportObjectivesToModifyMetadata" arotmm
            ON arof."activityReportObjectiveId" = ANY(arotmm."toRemove")
            LEFT JOIN "ActivityReportObjectiveFiles" arof2
            ON arof2."activityReportObjectiveId" = arotmm."toUpdate"
            AND arof."fileId" = arof2."fileId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertActivityReportObjectiveFiles', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertActivityReportObjectiveFiles" AS
        CREATE TEMP TABLE "InsertActivityReportObjectiveFiles" AS
        WITH insert_activity_report_objective_files AS (
            INSERT INTO "ActivityReportObjectiveFiles"
            (
            "activityReportObjectiveId",
            "fileId",
            "createdAt",
            "updatedAt"
            )
            SELECT
            "activityReportObjectiveId",
            "fileId",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportObjectiveFilesToModify" aroftm
            WHERE aroftm."toUpdate" IS NULL
            RETURNING
            id "activityReportObjectiveFileId",
            "activityReportObjectiveId"
        )
        SELECT * FROM insert_activity_report_objective_files;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateActivityReportObjectiveFiles', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateActivityReportObjectiveFiles" AS
        CREATE TEMP TABLE "UpdateActivityReportObjectiveFiles" AS
        WITH update_activity_report_objective_files AS (
            UPDATE "ActivityReportObjectiveFiles" "arof"
            SET
            "createdAt" = aroftm."createdAt",
            "updatedAt" = aroftm."updatedAt"
            FROM "ActivityReportObjectiveFilesToModify" aroftm
            WHERE "arof".id = aroftm."toUpdate"
            AND (
              "arof"."createdAt" != aroftm."createdAt"
              OR "arof"."updatedAt" != aroftm."updatedAt"
            )
            RETURNING
            "arof".id "activityReportObjectiveFileId",
            "arof"."activityReportObjectiveId"
        )
        SELECT * FROM update_activity_report_objective_files;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteActivityReportObjectiveFiles', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteActivityReportObjectiveFiles" AS
        CREATE TEMP TABLE "DeleteActivityReportObjectiveFiles" AS
        WITH delete_activity_report_objective_files AS (
            DELETE FROM "ActivityReportObjectiveFiles" "arof"
            USING "ActivityReportObjectiveFilesToModify" aroftm
            WHERE "arof".id = ANY(aroftm."toRemove")
            RETURNING
            "arof".id "activityReportObjectiveFileId",
            "arof"."activityReportObjectiveId"
        )SELECT * FROM delete_activity_report_objective_files;
        END;

        -- CREATE TABLE "ActivityReportObjectiveFileStats" AS (
        CREATE TEMP TABLE "ActivityReportObjectiveFileStats" AS (
            SELECT
            'ActivityReportObjectiveFiles' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectiveFiles") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectiveFiles") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectiveFiles") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveFiles" arof) "post_count"
        );
        -- Handle ActivityReportObjectiveResources
        CREATE TEMP TABLE "ActivityReportObjectiveResourcesToModify" AS (
            SELECT
            arotmm."toUpdate" "activityReportObjectiveId",
            aror."resourceId",
            (
                SELECT ARRAY_AGG(DISTINCT sfx."sourceField")
                FROM "ActivityReportObjectiveResources" "arorx"
                CROSS JOIN UNNEST("arorx"."sourceFields") sfx("sourceField")
                WHERE "aror"."resourceId" = arorx."resourceId"
                AND (arorx."activityReportObjectiveId" = ANY(ARRAY_AGG("aror"."activityReportObjectiveId"))
                OR arotmm."toUpdate" = arorx."activityReportObjectiveId")
            ) "sourceFields",
            MIN(LEAST("aror"."createdAt", "aror2"."createdAt")) "createdAt",
            MAX(GREATEST("aror"."updatedAt", "aror2"."updatedAt")) "updatedAt",
            ARRAY_AGG(DISTINCT "aror".id ORDER by "aror".id) "toRemove",
            (ARRAY_AGG(DISTINCT "aror2".id))[1] "toUpdate"
            FROM "ActivityReportObjectiveResources" aror
            JOIN "ActivityReportObjectivesToModifyMetadata" arotmm
            ON aror."activityReportObjectiveId" = ANY(arotmm."toRemove")
            LEFT JOIN "ActivityReportObjectiveResources" aror2
            ON aror2."activityReportObjectiveId" = arotmm."toUpdate"
            AND aror."resourceId" = aror2."resourceId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertActivityReportObjectiveResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertActivityReportObjectiveResources" AS
        CREATE TEMP TABLE "InsertActivityReportObjectiveResources" AS
        WITH insert_activity_report_objective_resources AS (
            INSERT INTO "ActivityReportObjectiveResources"
            (
            "activityReportObjectiveId",
            "resourceId",
            "sourceFields",
            "createdAt",
            "updatedAt"
            )
            SELECT
            "activityReportObjectiveId",
            "resourceId",
            "sourceFields",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportObjectiveResourcesToModify" arortm
            WHERE arortm."toUpdate" IS NULL
            RETURNING
            id "activityReportObjectiveResourceId",
            "activityReportObjectiveId"
        )SELECT * FROM insert_activity_report_objective_resources;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateActivityReportObjectiveResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateActivityReportObjectiveResources" AS
        CREATE TEMP TABLE "UpdateActivityReportObjectiveResources" AS
        WITH update_activity_report_objective_resources AS (
            UPDATE "ActivityReportObjectiveResources" "aror"
            SET
            "sourceFields" = arortm."sourceFields",
            "createdAt" = arortm."createdAt",
            "updatedAt" = arortm."updatedAt"
            FROM "ActivityReportObjectiveResourcesToModify" arortm
            WHERE "aror".id = arortm."toUpdate"
            AND (
              "aror"."sourceFields" != arortm."sourceFields"
              OR "aror"."createdAt" != arortm."createdAt"
              OR "aror"."updatedAt" != arortm."updatedAt"
            )
            RETURNING
            "aror".id "activityReportObjectiveResourceId",
            "aror"."activityReportObjectiveId"
        )SELECT * FROM update_activity_report_objective_resources;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteActivityReportObjectiveResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteActivityReportObjectiveResources" AS
        CREATE TEMP TABLE "DeleteActivityReportObjectiveResources" AS
        WITH delete_activity_report_objective_resources AS (
            DELETE FROM "ActivityReportObjectiveResources" "aror"
            USING "ActivityReportObjectiveResourcesToModify" arortm
            WHERE "aror".id = ANY(arortm."toRemove")
            RETURNING
            "aror".id "activityReportObjectiveResourceId",
            "aror"."activityReportObjectiveId"
        )SELECT * FROM delete_activity_report_objective_resources;
        END;

        -- CREATE TABLE "ActivityReportObjectiveResourceStats" AS (
        CREATE TEMP TABLE "ActivityReportObjectiveResourceStats" AS (
            SELECT
            'ActivityReportObjectiveResources' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectiveResources") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectiveResources") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectiveResources") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveResources" aror) "post_count"
        );
        -- Handle ActivityReportObjectiveTopics
        CREATE TEMP TABLE "ActivityReportObjectiveTopicsToModify" AS (
            SELECT
            arotmm."toUpdate" "activityReportObjectiveId",
            arot."topicId",
            MIN(LEAST("arot"."createdAt", "arot2"."createdAt")) "createdAt",
            MAX(GREATEST("arot"."updatedAt", "arot2"."updatedAt")) "updatedAt",
            ARRAY_AGG(DISTINCT "arot".id ORDER by "arot".id) "toRemove",
            (ARRAY_AGG(DISTINCT "arot2".id))[1] "toUpdate"
            FROM "ActivityReportObjectiveTopics" arot
            JOIN "ActivityReportObjectivesToModifyMetadata" arotmm
            ON arot."activityReportObjectiveId" = ANY(arotmm."toRemove")
            LEFT JOIN "ActivityReportObjectiveTopics" arot2
            ON arot2."activityReportObjectiveId" = arotmm."toUpdate"
            AND arot."topicId" = arot2."topicId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertActivityReportObjectiveTopics', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertActivityReportObjectiveTopics" AS
        CREATE TEMP TABLE "InsertActivityReportObjectiveTopics" AS
        WITH insert_activity_report_objective_topics AS  (
            INSERT INTO "ActivityReportObjectiveTopics"
            (
            "activityReportObjectiveId",
            "topicId",
            "createdAt",
            "updatedAt"
            )
            SELECT
            "activityReportObjectiveId",
            "topicId",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportObjectiveTopicsToModify" arottm
            WHERE arottm."toUpdate" IS NULL
            RETURNING
            id "activityReportObjectiveTopicId",
            "activityReportObjectiveId"
        )SELECT * FROM insert_activity_report_objective_topics;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateActivityReportObjectiveTopics', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateActivityReportObjectiveTopics" AS
        CREATE TEMP TABLE "UpdateActivityReportObjectiveTopics" AS
        WITH update_activity_report_objective_topics AS (
            UPDATE "ActivityReportObjectiveTopics" "arot"
            SET
            "createdAt" = arottm."createdAt",
            "updatedAt" = arottm."updatedAt"
            FROM "ActivityReportObjectiveTopicsToModify" arottm
            WHERE "arot".id = arottm."toUpdate"
            AND (
              "arot"."createdAt" != arottm."createdAt"
              OR "arot"."updatedAt" != arottm."updatedAt"
            )
            RETURNING
            "arot".id "activityReportObjectiveTopicId",
            "arot"."activityReportObjectiveId"
        )SELECT * FROM update_activity_report_objective_topics;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteActivityReportObjectiveTopics', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteActivityReportObjectiveTopics" AS
        CREATE TEMP TABLE "DeleteActivityReportObjectiveTopics" AS
        WITH delete_activity_report_objective_topics AS (
            DELETE FROM "ActivityReportObjectiveTopics" "arot"
            USING "ActivityReportObjectiveTopicsToModify" arottm
            WHERE "arot".id = ANY(arottm."toRemove")
            RETURNING
            "arot".id "activityReportObjectiveTopicId",
            "arot"."activityReportObjectiveId"
        )SELECT * FROM delete_activity_report_objective_topics;
        END;

        -- CREATE TABLE "ActivityReportObjectiveTopicStats" AS (
        CREATE TEMP TABLE "ActivityReportObjectiveTopicStats" AS (
            SELECT
            'ActivityReportObjectiveTopics' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectiveTopics") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectiveTopics") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectiveTopics") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveTopics" arot) "post_count"

        );

        BEGIN;-- Continue Handle ActivityReportObjectives
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateActivityReportObjectives', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateActivityReportObjectives" AS
        CREATE TEMP TABLE "UpdateActivityReportObjectives" AS
        WITH update_activity_report_objectives AS(
            UPDATE "ActivityReportObjectives" "aro"
            SET
            "arOrder" = arotm."arOrder",
            "ttaProvided" = arotm."ttaProvided",
            "createdAt" = arotm."createdAt",
            "updatedAt" = arotm."updatedAt"
            FROM "ActivityReportObjectivesToModify" arotm
            WHERE "aro".id = arotm."toUpdate"
            AND (
              "aro"."arOrder" != arotm."arOrder"
              OR "aro"."ttaProvided" != arotm."ttaProvided"
              OR "aro"."createdAt" != arotm."createdAt"
              OR "aro"."updatedAt" != arotm."updatedAt"
            )
            RETURNING
            "aro".id "activityReportObjectiveId",
            "aro"."objectiveId"
        )SELECT * FROM update_activity_report_objectives;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteActivityReportObjectives', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteActivityReportObjectives" AS
        CREATE TEMP TABLE "DeleteActivityReportObjectives" AS
        WITH
        -- Delete related rows from ActivityReportObjectiveFiles table
        deleted_arof AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING "ActivityReportObjectivesToModify" arotm
            WHERE arof."activityReportObjectiveId" = ANY(arotm."toRemove")
            RETURNING arof."activityReportObjectiveId"
        ),
        -- Delete rows from ActivityReportObjectives table
        deleted_aro AS (
            DELETE FROM "ActivityReportObjectives" "aro"
            USING "ActivityReportObjectivesToModify" arotm
            WHERE "aro".id = ANY(arotm."toRemove")
            RETURNING
                "aro".id "activityReportObjectiveId",
                "aro"."objectiveId"
        )
        SELECT * FROM deleted_aro;
        END;

        -- CREATE TABLE "ActivityReportObjectiveStats" AS (
        CREATE TEMP TABLE "ActivityReportObjectiveStats" AS (
            SELECT
            'ActivityReportObjectives' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectives") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectives") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectives") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectives" aro) "post_count"
        );
        -- Continue Handle Objectives
        CREATE TEMP TABLE "UpdateObjectives" AS
        WITH update_objectives AS (
            UPDATE "Objectives" "o"
            SET
            "createdAt" = otmm."createdAt",
            "updatedAt" = otmm."updatedAt",
            "onAR" = otmm."onAR",
            "onApprovedAR" = otmm."onApprovedAR",
            "firstNotStartedAt" = otmm."firstNotStartedAt",
            "lastNotStartedAt" = otmm."lastNotStartedAt",
            "firstInProgressAt" = otmm."firstInProgressAt",
            "lastInProgressAt" = otmm."lastInProgressAt",
            "firstCompleteAt" = otmm."firstCompleteAt",
            "lastCompleteAt" = otmm."lastCompleteAt",
            "firstSuspendedAt" = otmm."firstSuspendedAt",
            "lastSuspendedAt" = otmm."lastSuspendedAt",
            "rtrOrder" = otmm."rtrOrder",
            "createdVia" = otmm."createdVia"::"enum_Objectives_createdVia"
            FROM "ObjectivesToModifyMetadata" otmm
            WHERE "o".id = otmm."toUpdate"
            AND (
              "o"."createdAt" != otmm."createdAt"
              OR "o"."updatedAt" != otmm."updatedAt"
              OR "o"."onAR" != otmm."onAR"
              OR "o"."onApprovedAR" != otmm."onApprovedAR"
              OR "o"."firstNotStartedAt" != otmm."firstNotStartedAt"
              OR "o"."lastNotStartedAt" != otmm."lastNotStartedAt"
              OR "o"."firstInProgressAt" != otmm."firstInProgressAt"
              OR "o"."lastInProgressAt" != otmm."lastInProgressAt"
              OR "o"."firstCompleteAt" != otmm."firstCompleteAt"
              OR "o"."lastCompleteAt" != otmm."lastCompleteAt"
              OR "o"."firstSuspendedAt" != otmm."firstSuspendedAt"
              OR "o"."lastSuspendedAt" != otmm."lastSuspendedAt"
              OR "o"."rtrOrder" != otmm."rtrOrder"
              OR "o"."createdVia" != otmm."createdVia"::"enum_Objectives_createdVia"
            )
            RETURNING
            "o".id "objectiveId"
        )SELECT * FROM update_objectives;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteObjectives', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteObjectives" AS
        CREATE TEMP TABLE "DeleteObjectives" AS
        WITH
        -- Delete related rows from ActivityReportObjectiveFiles table
        deleted_arof AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING "ActivityReportObjectives" aro, "ObjectivesToModify" otm
            WHERE aro."objectiveId" = ANY(otm."toRemove") AND arof."activityReportObjectiveId" = aro.id
            RETURNING arof."activityReportObjectiveId"
        ),
        -- Delete related rows from ActivityReportObjectives table
        deleted_aro AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING "ObjectivesToModify" otm
            WHERE aro."objectiveId" = ANY(otm."toRemove")
            RETURNING aro."objectiveId"
        ),

        deleted_of AS (
            DELETE FROM "ObjectiveFiles" of
            USING "ObjectivesToModify" otm
            WHERE of."objectiveId" = ANY(otm."toRemove")
            RETURNING of."objectiveId"
        ),
        -- Delete rows from Objectives table
        deleted_o AS (
            DELETE FROM "Objectives" "o"
            USING "ObjectivesToModify" otm
            WHERE "o".id = ANY(otm."toRemove")
            RETURNING
                "o".id "objectiveId"
        )
        SELECT * FROM deleted_o;
        END;

        -- CREATE TABLE "ObjectiveStats" AS (
        CREATE TEMP TABLE "ObjectiveStats" AS (
            SELECT
            'Objectives' "table",
            (SELECT COUNT(*) FROM "InsertObjectives") "Inserts",
            (SELECT COUNT(*) FROM "UpdateObjectives") "Updates",
            (SELECT COUNT(*) FROM "DeleteObjectives") "Deletes",
            (SELECT COUNT(*) FROM "Objectives" o) "post_count"
        );
        -- Handle ActivityReportGoals
        -- CREATE TABLE "ActivityReportGoalsToModify" AS (
        CREATE TEMP TABLE "ActivityReportGoalsToModify" AS (
            SELECT
            dgoa."goalIds"[1] "goalId",
            arg."activityReportId",
            arg.name,
            arg.status,
            COALESCE(arg2.timeframe, arg.timeframe) timeframe,
            arg2."closeSuspendReason",
            arg2."closeSuspendContext",
            MAX(GREATEST(arg2."endDate", arg."endDate")) "endDate",
            CASE
                WHEN 'Yes' = ANY(ARRAY_AGG(arg."isRttapa"))
                OR 'Yes' = ANY(ARRAY_AGG(arg2."isRttapa"))
                THEN 'Yes'
                WHEN 'No' = ANY(ARRAY_AGG(arg."isRttapa"))
                OR 'No' = ANY(ARRAY_AGG(arg2."isRttapa"))
                THEN 'No'
                ELSE NULL
            END "isRttapa",
            BOOL_OR(COALESCE(arg."isActivelyEdited", FALSE) OR COALESCE(arg2."isActivelyEdited", FALSE)) "isActivelyEdited",
            MIN(LEAST("arg"."createdAt", "arg2"."createdAt")) "createdAt",
            MAX(GREATEST("arg"."updatedAt", "arg2"."updatedAt")) "updatedAt",
            ARRAY_AGG(DISTINCT "arg".id ORDER by "arg".id) "toRemove",
            (ARRAY_AGG(DISTINCT "arg2".id))[1] "toUpdate"
            FROM "ActivityReportGoals" arg
            JOIN "DupGoalsOnARs" dgoa
            ON "arg"."goalId" = ANY(dgoa."goalIds")
            AND "arg"."goalId" != dgoa."goalIds"[1]
            LEFT JOIN "ActivityReportGoals" "arg2"
            ON "arg2"."goalId" = dgoa."goalIds"[1]
            AND "arg"."activityReportId" = "arg2"."activityReportId"
            GROUP BY 1,2,3,4,5,6,7
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertActivityReportGoals', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertActivityReportGoals" AS
        CREATE TEMP TABLE "InsertActivityReportGoals" AS
        WITH insert_activity_report_goals AS (
            INSERT INTO "ActivityReportGoals"
            (
            "goalId",
            "activityReportId",
            name,
            status,
            "timeframe",
            "closeSuspendReason",
            "closeSuspendContext",
            "endDate",
            "isRttapa",
            "isActivelyEdited",
            "createdAt",
            "updatedAt"
            )
            SELECT
            "goalId",
            "activityReportId",
            name,
            status,
            "timeframe",
            "closeSuspendReason",
            "closeSuspendContext",
            "endDate",
            "isRttapa"::"enum_ActivityReportGoals_isRttapa",
            "isActivelyEdited",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportGoalsToModify" argtm
            WHERE argtm."toUpdate" IS NULL
            RETURNING
            id "activityReportGoalId",
            "goalId",
            "activityReportId"
        )SELECT * FROM insert_activity_report_goals;
        END;

        -- Handle ActivityReportGoals Metadata tables
        -- CREATE TABLE "ActivityReportGoalsToModifyMetadata" AS (
        CREATE TEMP TABLE "ActivityReportGoalsToModifyMetadata" AS (
            SELECT
            argtm."goalId",
            argtm."activityReportId",
            argtm.name,
            argtm.status,
            argtm."timeframe",
            argtm."closeSuspendReason",
            argtm."closeSuspendContext",
            argtm."endDate",
            argtm."isRttapa",
            argtm."isActivelyEdited",
            argtm."createdAt",
            argtm."updatedAt",
        argtm."toRemove",
            COALESCE(argtm."toUpdate", iarg."activityReportGoalId") "toUpdate"
            FROM "ActivityReportGoalsToModify" argtm
            LEFT JOIN "InsertActivityReportGoals" iarg
            ON argtm."goalId" = iarg."goalId"
            AND argtm."activityReportId" = iarg."activityReportId"
        );
        -- Handle ActivityReportGoalResources
        -- CREATE TABLE "ActivityReportGoalResourcesToModify" AS (
        CREATE TEMP TABLE "ActivityReportGoalResourcesToModify" AS (
            SELECT
            argtmm."toUpdate" "activityReportGoalId",
            argr."resourceId",
            (
                SELECT ARRAY_AGG(DISTINCT sfx."sourceField")
                FROM "ActivityReportGoalResources" "argrx"
                CROSS JOIN UNNEST("argrx"."sourceFields") sfx("sourceField")
                WHERE "argr"."resourceId" = argrx."resourceId"
                AND (argrx."activityReportGoalId" = ANY(ARRAY_AGG("argr"."activityReportGoalId"))
                OR argtmm."toUpdate" = argrx."activityReportGoalId")
            ) "sourceFields",
            MIN(LEAST("argr"."createdAt", "argr2"."createdAt")) "createdAt",
            MAX(GREATEST("argr"."updatedAt", "argr2"."updatedAt")) "updatedAt",
            ARRAY_AGG(DISTINCT "argr".id ORDER by "argr".id) "toRemove",
            (ARRAY_AGG(DISTINCT "argr2".id))[1] "toUpdate"
            FROM "ActivityReportGoalResources" argr
            JOIN "ActivityReportGoalsToModifyMetadata" argtmm
            ON argr."activityReportGoalId" = ANY(argtmm."toRemove")
            LEFT JOIN "ActivityReportGoalResources" argr2
            ON argr2."activityReportGoalId" = argtmm."toUpdate"
            AND argr."resourceId" = argr2."resourceId"
            GROUP BY 1,2
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_InsertActivityReportGoalResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "InsertActivityReportGoalResources" AS
        CREATE TEMP TABLE "InsertActivityReportGoalResources" AS
        WITH insert_activity_report_goals_resources AS (
            INSERT INTO "ActivityReportGoalResources"
            (
            "activityReportGoalId",
            "resourceId",
            "sourceFields",
            "createdAt",
            "updatedAt"
            )
            SELECT
            "activityReportGoalId",
            "resourceId",
            "sourceFields",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportGoalResourcesToModify" argrtm
            WHERE argrtm."toUpdate" IS NULL
            RETURNING
            id "activityReportGoalResourceId",
            "activityReportGoalId"
        )SELECT * FROM insert_activity_report_goals_resources;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateActivityReportGoalResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateActivityReportGoalResources" AS
        CREATE TEMP TABLE "UpdateActivityReportGoalResources" AS
        WITH update_activity_report_goals_resources AS  (
            UPDATE "ActivityReportGoalResources" "argr"
            SET
            "sourceFields" = argrtm."sourceFields",
            "createdAt" = argrtm."createdAt",
            "updatedAt" = argrtm."updatedAt"
            FROM "ActivityReportGoalResourcesToModify" argrtm
            WHERE "argr".id = argrtm."toUpdate"
            AND (
              "argr"."sourceFields" != argrtm."sourceFields"
              OR "argr"."createdAt" != argrtm."createdAt"
              OR "argr"."updatedAt" != argrtm."updatedAt"
            )
            RETURNING
            "argr".id "activityReportGoalResourceId",
            "argr"."activityReportGoalId"
        )SELECT * FROM update_activity_report_goals_resources;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteActivityReportGoalResources', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteActivityReportGoalResources" AS
        CREATE TEMP TABLE "DeleteActivityReportGoalResources" AS
        WITH delete_activity_report_goals_resources AS (
            DELETE FROM "ActivityReportGoalResources" "argr"
            USING "ActivityReportGoalResourcesToModify" argrtm
            WHERE "argr".id = ANY(argrtm."toRemove")
            RETURNING
            "argr".id "activityReportGoalResourceId",
            "argr"."activityReportGoalId"
        )SELECT * FROM delete_activity_report_goals_resources;
        END;

        -- CREATE TABLE "ActivityReportGoalResourceStats" AS (
        CREATE TEMP TABLE "ActivityReportGoalResourceStats" AS (
            SELECT
            'ActivityReportGoalResources' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportGoalResources") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportGoalResources") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportGoalResources") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportGoalResources" argr) "post_count"
        );

        BEGIN;-- Continue Handle ActivityReportGoals
        SELECT set_config('audit.auditDescriptor', 'dup_goals_UpdateActivityReportGoals', TRUE) as "auditDescriptor";
        -- CREATE TABLE "UpdateActivityReportGoals" AS
        CREATE TEMP TABLE "UpdateActivityReportGoals" AS
        WITH update_activity_report_goals AS (
            UPDATE "ActivityReportGoals" "arg"
            SET
            "timeframe" = argtm."timeframe",
            "endDate" = argtm."endDate",
            "isRttapa" = argtm."isRttapa"::"enum_ActivityReportGoals_isRttapa",
            "isActivelyEdited" = argtm."isActivelyEdited",
            "createdAt" = argtm."createdAt",
            "updatedAt" = argtm."updatedAt"
            FROM "ActivityReportGoalsToModify" argtm
            WHERE "arg".id = argtm."toUpdate"
            AND (
              "arg"."timeframe" != argtm."timeframe"
              OR "arg"."endDate" != argtm."endDate"
              OR "arg"."isRttapa" != argtm."isRttapa"::"enum_ActivityReportGoals_isRttapa"
              OR "arg"."isActivelyEdited" != argtm."isActivelyEdited"
              OR "arg"."createdAt" != argtm."createdAt"
              OR "arg"."updatedAt" != argtm."updatedAt"
            )
            RETURNING
            "arg".id "activityReportGoalId",
            "arg"."goalId"
        )SELECT * FROM update_activity_report_goals;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteActivityReportGoals', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteActivityReportGoals" AS
        CREATE TEMP TABLE "DeleteActivityReportGoals" AS
        WITH delete_activity_report_goals AS  (
            DELETE FROM "ActivityReportGoals" "arg"
            USING "ActivityReportGoalsToModify" argtm
            WHERE "arg".id = ANY(argtm."toRemove")
            RETURNING
            "arg".id "activityReportGoalId",
            "arg"."goalId"
        )SELECT * FROM delete_activity_report_goals;
        END;

        -- CREATE TABLE "ActivityReportGoalStats" AS (
        CREATE TEMP TABLE "ActivityReportGoalStats" AS (
            SELECT
            'ActivityReportGoals' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportGoals") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportGoals") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportGoals") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportGoals" ar) "post_count"

        );
        -- Continue Handle Goals

        CREATE TEMP TABLE "UpdateGoals" AS
        WITH update_goals AS (
            UPDATE "Goals" "g"
            SET
            "status" = gtm."status",
            "timeframe" = gtm."timeframe",
            "isFromSmartsheetTtaPlan" = gtm."isFromSmartsheetTtaPlan",
            "createdAt" = gtm."createdAt",
            "updatedAt" = gtm."updatedAt",
            "endDate" = gtm."endDate",
            "previousStatus" = gtm."previousStatus",
            "goalTemplateId" = gtm."goalTemplateId",
            "onAR" = gtm."onAR",
            "onApprovedAR" = gtm."onApprovedAR",
            "firstNotStartedAt" = gtm."firstNotStartedAt",
            "lastNotStartedAt" = gtm."lastNotStartedAt",
            "firstInProgressAt" = gtm."firstInProgressAt",
            "lastInProgressAt" = gtm."lastInProgressAt",
            "firstCeasedSuspendedAt" = gtm."firstCeasedSuspendedAt",
            "lastCeasedSuspendedAt" = gtm."lastCeasedSuspendedAt",
            "firstClosedAt" = gtm."firstClosedAt",
            "lastClosedAt" = gtm."lastClosedAt",
            "firstCompletedAt" = gtm."firstCompletedAt",
            "lastCompletedAt" = gtm."lastCompletedAt",
            "isRttapa" = gtm."isRttapa"::"enum_Goals_isRttapa",
            "createdVia" = gtm."createdVia"::"enum_Goals_createdVia"
            FROM "GoalsToModify" gtm
            WHERE "g".id = gtm."toUpdate"
            AND (
              "g"."status" != gtm."status"
              OR "g"."timeframe" != gtm."timeframe"
              OR "g"."isFromSmartsheetTtaPlan" != gtm."isFromSmartsheetTtaPlan"
              OR "g"."createdAt" != gtm."createdAt"
              OR "g"."updatedAt" != gtm."updatedAt"
              OR "g"."endDate" != gtm."endDate"
              OR "g"."previousStatus" != gtm."previousStatus"
              OR "g"."goalTemplateId" != gtm."goalTemplateId"
              OR "g"."onAR" != gtm."onAR"
              OR "g"."onApprovedAR" != gtm."onApprovedAR"
              OR "g"."firstNotStartedAt" != gtm."firstNotStartedAt"
              OR "g"."lastNotStartedAt" != gtm."lastNotStartedAt"
              OR "g"."firstInProgressAt" != gtm."firstInProgressAt"
              OR "g"."lastInProgressAt" != gtm."lastInProgressAt"
              OR "g"."firstCeasedSuspendedAt" != gtm."firstCeasedSuspendedAt"
              OR "g"."lastCeasedSuspendedAt" != gtm."lastCeasedSuspendedAt"
              OR "g"."firstClosedAt" != gtm."firstClosedAt"
              OR "g"."lastClosedAt" != gtm."lastClosedAt"
              OR "g"."firstCompletedAt" != gtm."firstCompletedAt"
              OR "g"."lastCompletedAt" != gtm."lastCompletedAt"
              OR "g"."isRttapa" != gtm."isRttapa"::"enum_Goals_isRttapa"
              OR "g"."createdVia" != gtm."createdVia"::"enum_Goals_createdVia"
            )
            RETURNING
            "g".id "goalId"
        )SELECT * FROM update_goals;
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_DeleteGoals', TRUE) as "auditDescriptor";
        -- CREATE TABLE "DeleteGoals" AS
        CREATE TEMP TABLE "DeleteGoals" AS
        WITH
        -- Delete related rows from ActivityReportObjectives table
        deleted_arof AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING "Objectives" o, "GoalsToModify" gtm, "ActivityReportObjectives" aro
            WHERE o."goalId" = ANY(gtm."toRemove") AND aro."objectiveId" = o.id AND arof."activityReportObjectiveId" = aro.id
            RETURNING arof."activityReportObjectiveId"
        ),
        -- Delete related rows from ActivityReportObjectives table
        deleted_aro AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING "Objectives" o, "GoalsToModify" gtm
            WHERE o."goalId" = ANY(gtm."toRemove") AND aro."objectiveId" = o.id
            RETURNING aro."objectiveId"
        ),
        -- Delete related rows from ObjectiveFiles table
        deleted_of AS (
            DELETE FROM "ObjectiveFiles" of
            USING "Objectives" o, "GoalsToModify" gtm
            WHERE o."goalId" = ANY(gtm."toRemove") AND of."objectiveId" = o.id
            RETURNING of."objectiveId"
        ),
        -- Delete related rows from Objectives table
        deleted_o AS (
            DELETE FROM "Objectives" o
            USING "GoalsToModify" gtm
            WHERE o."goalId" = ANY(gtm."toRemove")
            RETURNING o."goalId"
        ),
        -- Delete rows from Goals table
        deleted_g AS (
            DELETE FROM "Goals" "g"
            USING "GoalsToModify" gtm
            WHERE "g".id = ANY(gtm."toRemove")
            RETURNING
                "g".id "goalId"
        )
        SELECT * FROM deleted_g;
        END;

        -- CREATE TABLE "GoalStats" AS (
        CREATE TEMP TABLE "GoalStats" AS (
            SELECT
            'Goals' "table",
            0 "Inserts",
            (SELECT COUNT(*) FROM "UpdateGoals") "Updates",
            (SELECT COUNT(*) FROM "DeleteGoals") "Deletes",
            (SELECT COUNT(*) FROM "Goals" g) "post_count"
        );
        -- CREATE TABLE "CollectStats" AS (
        CREATE TABLE "CollectStats" AS (
            SELECT 1 id, *,
                (SELECT "GoalsTotal" FROM "PreCountStats") AS pre_count
            FROM "GoalStats"
            UNION
            SELECT 2 id, *,
                (SELECT "ActivityReportGoalsTotal" FROM "PreCountStats") AS pre_count
            FROM "ActivityReportGoalStats"
            UNION
            SELECT 3 id, *,
                (SELECT "ActivityReportGoalResourcesTotal" FROM "PreCountStats") AS pre_count
            FROM "ActivityReportGoalResourceStats"
            UNION
            SELECT 4 id, *,
                (SELECT "ObjectivesTotal" FROM "PreCountStats") AS pre_count
             FROM "ObjectiveStats"
            UNION
            SELECT 5 id, *,
                (SELECT "ObjectiveFilesTotal" FROM "PreCountStats") AS pre_count
            FROM "ObjectiveFileStats"
            UNION
            SELECT 6 id, *,
                (SELECT "ObjectiveResourcesTotal" FROM "PreCountStats") AS pre_count
            FROM "ObjectiveResourceStats"
            UNION
            SELECT 7 id, *,
                (SELECT "ObjectiveTopicsTotal" FROM "PreCountStats") AS pre_count
            FROM "ObjectiveTopicStats"
            UNION
            SELECT 8 id, *,
                (SELECT "ActivityReportObjectivesTotal" FROM "PreCountStats") AS pre_count
            FROM "ActivityReportObjectiveStats"
            UNION
            SELECT 9 id, *,
                (SELECT "ActivityReportObjectiveFilesTotal" FROM "PreCountStats") AS pre_count
            FROM "ActivityReportObjectiveFileStats"
            UNION
            SELECT 10 id, *,
                (SELECT "ActivityReportObjectiveResourcesTotal" FROM "PreCountStats") AS pre_count
            FROM "ActivityReportObjectiveResourceStats"
            UNION
            SELECT 11 id, *,
                (SELECT "ActivityReportObjectiveTopicsTotal" FROM "PreCountStats") AS pre_count
            FROM "ActivityReportObjectiveTopicStats"
        )
        ORDER BY id;
          `, { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  // Reverting the deletion is not possible, as the deleted records are lost
  down: () => {},
};
