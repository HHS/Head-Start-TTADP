module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      try {
        const loggedUser = '0'
        const sessionSig = __filename
        const auditDescriptor = 'RUN MIGRATIONS'
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction }
        )
      } catch (err) {
        console.error(err) // eslint-disable-line no-console
        throw err
      }
      try {
        // Delete duplicate goals based on trimmed_hashes, keeping the one with the lowest id
        await queryInterface.sequelize.query(
          `
        -- Collect Pre Count Stats
        DROP TABLE IF EXISTS "PreCountStatsByRegion";
        CREATE TEMP TABLE "PreCountStatsByRegion" AS (
            SELECT
                gr."regionId",
                COUNT(DISTINCT g."id") "GoalsTotal",
                COUNT(DISTINCT arg."id") "ActivityReportGoalsTotal",
                COUNT(DISTINCT argr."id") "ActivityReportGoalResourcesTotal",
                COUNT(DISTINCT oj."id") "ObjectivesTotal",
                COUNT(DISTINCT ojf."id") "ObjectiveFilesTotal",
                COUNT(DISTINCT ojr."id") "ObjectiveResourcesTotal",
                COUNT(DISTINCT ojt."id") "ObjectiveTopicsTotal",
                COUNT(DISTINCT aro."id") "ActivityReportObjectivesTotal",
                COUNT(DISTINCT arof."id") "ActivityReportObjectiveFilesTotal",
                COUNT(DISTINCT aror."id") "ActivityReportObjectiveResourcesTotal",
                COUNT(DISTINCT arot."id") "ActivityReportObjectiveTopicsTotal"
            FROM "Grants" gr
            FULL OUTER JOIN "Goals" g ON gr."id" = g."grantId"
            FULL OUTER JOIN "ActivityReportGoals" arg ON g."id" = arg."goalId"
            FULL OUTER JOIN "ActivityReportGoalResources" argr ON arg."id" = argr."activityReportGoalId"
            FULL OUTER JOIN "Objectives" oj ON g."id" = oj."goalId"
            FULL OUTER JOIN "ObjectiveFiles" ojf ON oj."id" = ojf."objectiveId"
            FULL OUTER JOIN "ObjectiveResources" ojr ON oj."id" = ojr."objectiveId"
            FULL OUTER JOIN "ObjectiveTopics" ojt ON oj."id" = ojt."objectiveId"
            FULL OUTER JOIN "ActivityReportObjectives" aro ON oj."id" = aro."objectiveId"
            FULL OUTER JOIN "ActivityReportObjectiveFiles" arof ON aro."id" = arof."activityReportObjectiveId"
            FULL OUTER JOIN "ActivityReportObjectiveResources" aror ON aro."id" = aror."activityReportObjectiveId"
            FULL OUTER JOIN "ActivityReportObjectiveTopics" arot ON aro."id" = arot."activityReportObjectiveId"
            GROUP BY gr."regionId"
        );
        INSERT INTO "PreCountStatsByRegion"
        SELECT
            -1 "regionId",
            SUM("GoalsTotal"),
            SUM("ActivityReportGoalsTotal"),
            SUM("ActivityReportGoalResourcesTotal"),
            SUM("ObjectivesTotal"),
            SUM("ObjectiveFilesTotal"),
            SUM("ObjectiveResourcesTotal"),
            SUM("ObjectiveTopicsTotal"),
            SUM("ActivityReportObjectivesTotal"),
            SUM("ActivityReportObjectiveFilesTotal"),
            SUM("ActivityReportObjectiveResourcesTotal"),
            SUM("ActivityReportObjectiveTopicsTotal")
        FROM "PreCountStatsByRegion";
        SELECT * FROM "PreCountStatsByRegion";

        DROP TABLE IF EXISTS "DupGoalsOnARs";
        CREATE TEMP TABLE "DupGoalsOnARs" AS (
            SELECT
            array_remove(ARRAY_AGG(DISTINCT arg."activityReportId"), NULL) "activityReportIds",
            g."grantId",
            MD5(TRIM(g.name)) "goalHash",
            ARRAY_AGG(DISTINCT g.id ORDER BY g.id) "goalIds",
            array_remove(ARRAY_AGG(DISTINCT g.id ORDER BY g.id),MIN(g.id)) "toRemoveGoals",
            MIN(g.id) "toUpdateGoal",
            COUNT(DISTINCT g.id) "goalCnt",
            g."status" = 'Closed' "statusClosed"
            FROM "Goals" g
            LEFT JOIN "ActivityReportGoals" arg
            ON arg."goalId" = g.id
            LEFT JOIN "GoalTemplates" gt
            ON g."goalTemplateId" = gt.id
            GROUP BY 2,3,8
            HAVING ARRAY_LENGTH(array_remove(ARRAY_AGG(DISTINCT g.id ORDER BY g.id),MIN(g.id)), 1) > 0
            ORDER BY 5 DESC
        );
        -- SELECT * FROM "DupGoalsOnARs";

        DROP TABLE IF EXISTS "GoalsToModify";
        CREATE TEMP TABLE "GoalsToModify" AS (
            SELECT DISTINCT
                g2."grantId",
                TRIM(g.name) "name",
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
                array_remove(ARRAY_AGG(DISTINCT "g".id ORDER by "g".id), MIN("g2".id)) "toRemove",
                MIN("g2".id) "toUpdate"
            FROM "Goals" g
            JOIN "DupGoalsOnARs" dgoa
            ON g.id = ANY(dgoa."toRemoveGoals")
            AND g.id != dgoa."toUpdateGoal"
            JOIN "Goals" g2
            ON g2.id = dgoa."toUpdateGoal"
            AND g."grantId" = dgoa."grantId"
            AND MD5(TRIM(g.name)) = MD5(TRIM(g2.name))
            GROUP BY 1,2,3,9,10
        );
        -- SELECT * FROM "GoalsToModify";

        -- All objectives that are duplicates on goals that are duplicates on the same AR
        DROP TABLE IF EXISTS "DupObjectivesOnDupGoalsOnARs";
        CREATE TEMP TABLE "DupObjectivesOnDupGoalsOnARs" AS (
            SELECT
                dgoa.*,
                MD5(TRIM(o.title)) "objectiveHash",
                o.status = 'Complete' "statusComplete",
                ARRAY_AGG(o.id ORDER BY o."goalId", o.id) "objectiveIds",
                array_remove(ARRAY_AGG(o.id ORDER BY o."goalId", o.id),(MIN(o.id) FILTER (WHERE o."goalId" = dgoa."toUpdateGoal"))) "toRemoveObjectives",
                MIN(o.id) FILTER (WHERE o."goalId" = dgoa."toUpdateGoal") "toUpdateObjective",
                COUNT(DISTINCT o.id) "objectiveCnt"
            FROM "Objectives" o
            JOIN "DupGoalsOnARs" dgoa
            ON o."goalId" = ANY(dgoa."goalIds")
            GROUP BY 1,2,3,4,5,6,7,8,9,10
            HAVING ARRAY_LENGTH(ARRAY_AGG(DISTINCT o.id), 1) > 1
            ORDER BY 8 DESC
        );
        -- SELECT * FROM "DupObjectivesOnDupGoalsOnARs";

        -- All objectives that are duplicates on goals that are not duplicates on the same AR
        DROP TABLE IF EXISTS "DupObjectivesOnNonDupGoalsOnARs";
        CREATE TEMP TABLE "DupObjectivesOnNonDupGoalsOnARs" AS (
            SELECT DISTINCT
                array_remove(ARRAY_AGG(DISTINCT aro."activityReportId"), NULL) "activityReportIds",
                g."grantId",
                MD5(TRIM(g.name)) "goalHash",
                ARRAY[g.id] "goalIds",
                ARRAY[]::int[] "toRemove",
                g.id "toUpdate",
                1 "goalCnt",
                g."status" = 'Closed' "statusClosed",
                MD5(TRIM(o.title)) "objectiveHash",
                o.status = 'Complete' "statusComplete",
                ARRAY_AGG(o.id ORDER BY o.id) "objectiveIds",
                array_remove(ARRAY_AGG(o.id ORDER BY o.id),MIN(o.id)) "toRemoveObjectives",
                MIN(o.id) "toUpdateObjective",
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
            AND MD5(TRIM(o.title)) = doodgoa."objectiveHash"
            AND o.id != ANY(doodgoa."objectiveIds")
            WHERE doodgoa."grantId" IS NULL 
            GROUP BY 2,3,4,5,6,7,8,9,10
            HAVING ARRAY_LENGTH(ARRAY_AGG(DISTINCT o.id), 1) > 1
            ORDER BY 11 DESC
        );
        -- SELECT * FROM "DupObjectivesOnNonDupGoalsOnARs";

        -- All objectives that are duplicates on goals that are (not) duplicates on the same AR
        DROP TABLE IF EXISTS "DupObjectivesOnARs";
        CREATE TEMP TABLE "DupObjectivesOnARs" AS (
            SELECT
            *
            FROM "DupObjectivesOnDupGoalsOnARs"
            UNION
            SELECT
            *
            FROM "DupObjectivesOnNonDupGoalsOnARs"
        );
        -- SELECT * FROM "DupObjectivesOnARs";

        -- Handle Objectives
        DROP TABLE IF EXISTS "ObjectivesToModify";
        CREATE TEMP TABLE "ObjectivesToModify" AS (
            SELECT DISTINCT
                dooa."toUpdateGoal" "goalId",
                TRIM(o."title") "title",
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
                BOOL_OR(COALESCE(o."onApprovedAR", FALSE) OR COALESCE(o2."onApprovedAR", FALSE)) "onApprovedAR",
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
                BOOL_OR(COALESCE(o."onAR", FALSE) OR COALESCE(o2."onAR", FALSE)) "onAR",
                ARRAY_AGG(DISTINCT "o".id ORDER by "o".id) "toRemove",
                MIN("o2".id) "toUpdate"
            FROM "Objectives" o
            JOIN "DupObjectivesOnARs" dooa
            ON o.id = ANY(dooa."toRemoveObjectives")
            AND o.id != COALESCE(dooa."toUpdateObjective",0)
            LEFT JOIN "Objectives" o2
            ON o2.id = dooa."toUpdateObjective"
            AND o2."goalId" = dooa."toUpdateGoal"
            GROUP BY 1,2,3,7
        );
        -- SELECT * FROM "ObjectivesToModify";

        --somehow there are duplicates in here, so dedupe
        DROP TABLE IF EXISTS "DeduplicatedObjectivesToModify";
        CREATE TEMP TABLE "DeduplicatedObjectivesToModify" AS (
            SELECT DISTINCT ON ("goalId", "objectiveHash")
                "goalId",
                TRIM("title") "title",
                "status",
                "createdAt",
                "updatedAt",
                "otherEntityId",
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
                "createdVia",
                "toRemove",
                "toUpdate",
                "objectiveHash",
                "onAR"
            FROM "ObjectivesToModify"
            ORDER BY "goalId", "objectiveHash", "createdAt"
        );

        DROP TABLE IF EXISTS "UniqueObjectivesOnGoalsToBeRemoved";
        CREATE TEMP TABLE "UniqueObjectivesOnGoalsToBeRemoved" AS (
            WITH
                "GoalsToModifyIds" AS (
                    SELECT
                        gtm."toUpdate",
                        tr."toRemove"
                    FROM "GoalsToModify" gtm
                    CROSS JOIN UNNEST(gtm."toRemove") tr("toRemove")
                ),
                "ObjectivesToModifyIds" AS (
                    SELECT
                        dotm."toUpdate",
                        tr."toRemove"
                    FROM "DeduplicatedObjectivesToModify" dotm
                    CROSS JOIN UNNEST(dotm."toRemove") tr("toRemove")
                )
            SELECT DISTINCT
                o.id,
                o."goalId" "oldGoalId",
                gtmi."toUpdate" "newGoalId"
            FROM "Objectives" o
            JOIN "GoalsToModifyIds" gtmi
            ON o."goalId" = gtmi."toRemove"
            LEFT JOIN "ObjectivesToModifyIds" otmi
            ON o.id = otmi."toRemove"
            WHERE otmi."toUpdate" IS NULL
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Shift_Objectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "ShiftObjectives";
        CREATE TEMP TABLE "ShiftObjectives" AS
            WITH shift_objectives AS (
                UPDATE "Objectives" "o"
                SET
                    "goalId" = uoogtbr."newGoalId"
                FROM "UniqueObjectivesOnGoalsToBeRemoved" uoogtbr
                WHERE "o".id = uoogtbr.id
                RETURNING
                "o".id "updated_objective_id",
                uoogtbr."oldGoalId" "old_goal_id",
                uoogtbr."newGoalId" "new_goal_id"
            )
        SELECT * FROM shift_objectives;
        -- SELECT * FROM "ShiftObjectives";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_Objectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertObjectives";
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
            TRIM("title") "title",
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
                id "inserted_objective_id",
                id "objectiveId",
                "goalId",
                MD5(TRIM("title")) "objectiveHash"
        )
        SELECT * FROM inserted_objectives;
        -- SELECT * FROM "InsertObjectives";
        END;

        -- Update foreign key references in ActivityReportObjectives
        -- UPDATE "ActivityReportObjectives" aro
        -- SET "objectiveId" = "InsertObjectives"."inserted_objective_id"
        -- FROM "InsertObjectives"
        -- WHERE aro."objectiveId" = "InsertObjectives"."old_objective_id";

        -- somehow there are duplicates in here, so dedupe
        DROP TABLE IF EXISTS "DeduplicatedInsertObjectives";
        CREATE TEMP TABLE "DeduplicatedInsertObjectives" AS (
            SELECT DISTINCT ON ("goalId", "objectiveHash")
                "objectiveId",
                "goalId",
                "objectiveHash"
            FROM "InsertObjectives"
            ORDER BY "goalId", "objectiveHash"
        );

        -- Handle Objectives Metadata tables
        DROP TABLE IF EXISTS "ObjectivesToModifyMetadata";
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
        -- SELECT * FROM "ObjectivesToModifyMetadata";
        
        --Check for Extra Objectives 

        -- SELECT "grantId", "goalHash", "objectiveHash", COUNT(*), array_to_json(array_agg(row_to_json(doodgoa)))
        -- FROM "DupObjectivesOnDupGoalsOnARs" doodgoa
        -- GROUP BY "grantId", "goalHash", "objectiveHash"
        -- HAVING COUNT(*) > 1;

        -- SELECT "grantId", "goalHash", "objectiveHash", COUNT(*) , array_to_json(array_agg(row_to_json(doondgoa)))
        -- FROM "DupObjectivesOnNonDupGoalsOnARs"doondgoa
        -- GROUP BY "grantId", "goalHash", "objectiveHash"
        -- HAVING COUNT(*) > 1;

        -- SELECT "goalId", "objectiveHash", COUNT(*), array_to_json(array_agg(row_to_json(otm)))
        -- FROM "ObjectivesToModify" otm
        -- GROUP BY "goalId", "objectiveHash"
        -- HAVING COUNT(*) > 1;

        -- SELECT "goalId", "objectiveHash", COUNT(*), array_to_json(array_agg(row_to_json(io)))
        -- FROM "InsertObjectives" io
        -- GROUP BY "goalId", "objectiveHash"
        -- HAVING COUNT(*) > 1;

        -- SELECT "goalId", "objectiveHash", COUNT(*)
        -- FROM "DeduplicatedObjectivesToModify"
        -- GROUP BY "goalId", "objectiveHash"
        -- HAVING COUNT(*) > 1;

        -- SELECT "goalId", "objectiveHash", COUNT(*)
        -- FROM "DeduplicatedInsertObjectives"
        -- GROUP BY "goalId", "objectiveHash"
        -- HAVING COUNT(*) > 1;

        -- SELECT "goalId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(otmm)))
        -- FROM "ObjectivesToModifyMetadata" otmm
        -- GROUP BY "goalId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        -- SELECT o1."goalId", o1."title", o1."objectiveHash", o2."title", o2."objectiveHash"
        -- FROM "ObjectivesToModify" o1
        -- JOIN "ObjectivesToModify" o2
        -- ON o1."goalId" = o2."goalId"
        -- AND o1."title" ILIKE o2."title"
        -- AND o1."objectiveHash" != o2."objectiveHash";
        
        -- Validate ObjectiveFiles objectiveId null value

        -- WITH otmm_recast AS (
        --     SELECT *,
        --         UNNEST("toRemove") to_remove
        --     FROM "ObjectivesToModifyMetadata"
        -- )
        -- SELECT *
        -- FROM "ObjectiveFiles" "of"
        -- JOIN otmm_recast otmm
        -- ON "of"."objectiveId" = to_remove
        -- LEFT JOIN "ObjectiveFiles" "of2"
        -- ON "of2"."objectiveId" = otmm."toUpdate"
        -- AND "of"."fileId" = "of2"."fileId";
        
        -- Handle ObjectiveFiles
        DROP TABLE IF EXISTS "ObjectiveFilesToModify";
        CREATE TEMP TABLE "ObjectiveFilesToModify" AS (
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ObjectivesToModifyMetadata"
                )
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
            JOIN otmm_recast otmm
            ON "of"."objectiveId" = to_remove
            LEFT JOIN "ObjectiveFiles" "of2"
            ON "of2"."objectiveId" = otmm."toUpdate"
            AND "of"."fileId" = "of2"."fileId"
            GROUP BY 1,2
        );

        -- Validate Handle ObjectiveFilesToModify
        -- SELECT * FROM "ObjectiveFilesToModify";
        -- SELECT "objectiveId", "fileId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ObjectiveFilesToModify" ofmm
        -- GROUP BY "objectiveId", "fileId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ObjectiveFiles', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertObjectiveFiles";
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
            WHERE oftm."toUpdate" IS NULL and oftm."objectiveId" IS NOT NULL
            RETURNING
            id "objectiveFileId",
            "objectiveId"
        )
        SELECT * FROM objective_files;
        -- SELECT * FROM "InsertObjectiveFiles";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ObjectiveFiles', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateObjectiveFiles";
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
        -- SELECT * FROM "UpdateObjectiveFiles";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ObjectiveFiles', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteObjectiveFiles";
        CREATE TEMP TABLE "DeleteObjectiveFiles" AS
        WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ObjectiveFilesToModify"
                ),
            del_objective_files AS (
            DELETE FROM "ObjectiveFiles" "of"
            USING otmm_recast oftm
            WHERE "of".id = to_remove
            RETURNING
            "of".id "objectiveFileId",
            "of"."objectiveId"
        )
        SELECT * FROM del_objective_files;
        -- SELECT * FROM "UpdateObjectiveFiles";

        DROP TABLE IF EXISTS "ObjectiveFileStats";
        CREATE TEMP TABLE "ObjectiveFileStats" AS (
            SELECT
            'ObjectiveFiles' "table",
            (SELECT COUNT(*) FROM "InsertObjectiveFiles") "Inserts",
            (SELECT COUNT(*) FROM "UpdateObjectiveFiles") "Updates",
            (SELECT COUNT(*) FROM "DeleteObjectiveFiles") "Deletes",
            (SELECT COUNT(*) FROM "ObjectiveFiles") "post_count"
        );

        -- Validate ObjectiveResources objectiveId null value

        -- WITH otmm_recast AS (
        --     SELECT *,
        --         UNNEST("toRemove") to_remove
        --     FROM "ObjectivesToModifyMetadata"
        -- )
        -- SELECT *
        -- FROM "ObjectiveResources" "or"
        -- JOIN otmm_recast otmm
        -- ON "or"."objectiveId" = to_remove
        -- LEFT JOIN "ObjectiveResources" "or2"
        -- ON "or2"."objectiveId" = otmm."toUpdate"
        -- AND "or"."resourceId" = "or2"."resourceId";
        
        -- Handle ObjectiveResources

        DROP TABLE IF EXISTS "ObjectiveResourcesToModify";
        CREATE TEMP TABLE "ObjectiveResourcesToModify" AS (
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ObjectivesToModifyMetadata"
                )
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
            JOIN otmm_recast otmm
            ON "or"."objectiveId" = to_remove
            LEFT JOIN "ObjectiveResources" "or2"
            ON "or2"."objectiveId" = otmm."toUpdate"
            AND "or"."resourceId" = "or2"."resourceId"
            GROUP BY 1,2
        );
        -- SELECT * FROM "ObjectiveResourcesToModify";
        -- SELECT "resourceId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ObjectiveResourcesToModify" ofmm
        -- GROUP BY "resourceId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;
        
        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ObjectiveResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertObjectiveResources";
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
                WHERE ortm."toUpdate" IS NULL and ortm."objectiveId" IS NOT NULL
                RETURNING
                id "objectiveResourceId",
                "objectiveId"
            )
        SELECT * FROM insert_objective_resources;
        -- SELECT * FROM "InsertObjectiveResources";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ObjectiveResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateObjectiveResources";
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
        -- SELECT * FROM "UpdateObjectiveResources";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ObjectiveResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteObjectiveResources";
        CREATE TEMP TABLE "DeleteObjectiveResources" AS
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ObjectiveResourcesToModify"
                ),
            delete_objective_resources AS
            (
                DELETE FROM "ObjectiveResources" "or"
                USING otmm_recast ortm
                WHERE "or".id = to_remove
                RETURNING
                "or".id "objectiveResourceId",
                "or"."objectiveId"
            )
        SELECT * FROM delete_objective_resources;
        -- SELECT * FROM "DeleteObjectiveResources";
        END;

        DROP TABLE IF EXISTS "ObjectiveResourceStats";
        CREATE TEMP TABLE "ObjectiveResourceStats" AS
            (
                SELECT
                'ObjectiveResources' "table",
                (SELECT COUNT(*) FROM "InsertObjectiveResources") "Inserts",
                (SELECT COUNT(*) FROM "UpdateObjectiveResources") "Updates",
                (SELECT COUNT(*) FROM "DeleteObjectiveResources") "Deletes",
                (SELECT COUNT(*) FROM "ObjectiveResources" "or") "post_count"
            );

        -- Validate ObjectiveTopics objectiveId null values

        -- WITH otmm_recast AS (
        --     SELECT *,
        --         UNNEST("toRemove") to_remove
        --     FROM "ObjectivesToModifyMetadata"
        -- )
        -- SELECT *
        -- FROM "ObjectiveTopics" "ot"
        -- JOIN  otmm_recast otmm
        -- ON "ot"."objectiveId" = to_remove
        -- LEFT JOIN "ObjectiveTopics" "ot2"
        -- ON "ot2"."objectiveId" = otmm."toUpdate"
        -- AND "ot"."topicId" = "ot2"."topicId";

        -- Handle ObjectiveTopics

            DROP TABLE IF EXISTS "ObjectiveTopicsToModify";
            CREATE TEMP TABLE "ObjectiveTopicsToModify" AS (
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ObjectivesToModifyMetadata"
                )
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
            JOIN  otmm_recast otmm
            ON "ot"."objectiveId" = to_remove
            LEFT JOIN "ObjectiveTopics" "ot2"
            ON "ot2"."objectiveId" = otmm."toUpdate"
            AND "ot"."topicId" = "ot2"."topicId"
            GROUP BY 1,2
        );

        -- Validate Handle ObjectiveTopicsToModify
        -- SELECT * FROM "ObjectiveTopicsToModify";
        -- SELECT "topicId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ObjectiveTopicsToModify" ofmm
        -- GROUP BY "topicId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ObjectiveTopics', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertObjectiveTopics";
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
            WHERE ottm."toUpdate" IS NULL AND ottm."objectiveId" IS NOT NULL
            RETURNING
            id "objectiveTopicId",
            "objectiveId"
        )
        SELECT * FROM insert_objective_topics;
        -- SELECT * FROM "InsertObjectiveTopics";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ObjectiveTopics', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateObjectiveTopics";
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
        -- SELECT * FROM "UpdateObjectiveTopics";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ObjectiveTopics', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteObjectiveTopics";
        CREATE TEMP TABLE "DeleteObjectiveTopics" AS
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ObjectiveTopicsToModify"
                ),
            delete_objective_topics AS (
            DELETE FROM "ObjectiveTopics" "ot"
            USING otmm_recast ottm
            WHERE "ot".id = to_remove
            RETURNING
            "ot".id "objectiveTopicId",
            "ot"."objectiveId"
        )
        SELECT * FROM delete_objective_topics;
        -- SELECT * FROM "DeleteObjectiveTopics";
        END;

        DROP TABLE IF EXISTS "ObjectiveTopicStats";
        CREATE TEMP TABLE "ObjectiveTopicStats" AS (
            SELECT
            'ObjectiveTopics' "table",
            (SELECT COUNT(*) FROM "InsertObjectiveTopics") "Inserts",
            (SELECT COUNT(*) FROM "UpdateObjectiveTopics") "Updates",
            (SELECT COUNT(*) FROM "DeleteObjectiveTopics") "Deletes",
            (SELECT COUNT(*) FROM "ObjectiveTopics" ot) "post_count"
        );
        -- Continue Handle Objectives
        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_Objectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateObjectives";
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
            "o".id "updated_objective_id",
            otmm."toUpdate" "old_objective_id"
        )
        SELECT * FROM update_objectives;
        -- SELECT * FROM "UpdateObjectives";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportObjectives', TRUE) as "auditDescriptor";
        -- Update foreign key references in ActivityReportObjectives
        UPDATE "ActivityReportObjectives" aro
        SET "objectiveId" = "UpdateObjectives"."updated_objective_id"
        FROM "UpdateObjectives"
        WHERE aro."objectiveId" = "UpdateObjectives"."old_objective_id";
        END;
        
        -- Handle ActivityReportObjectives
        DROP TABLE IF EXISTS "ActivityReportObjectivesToModify";
        CREATE TEMP TABLE "ActivityReportObjectivesToModify" AS (
            WITH otmm_recast AS (
            SELECT *,
                UNNEST("toRemove") to_remove
                FROM "ObjectivesToModifyMetadata"
                )
                SELECT
                    otmm."toUpdate" "objectiveId",
                    aro."activityReportId",
                    aro.title,
                    aro.status,
                    MIN(LEAST(aro."arOrder", aro2."arOrder")) "arOrder",
                    STRING_AGG(DISTINCT "arox"."ttaProvided", E'\n') "ttaProvided",
                    MIN(LEAST("aro"."createdAt", "aro2"."createdAt")) "createdAt",
                    MAX(GREATEST("aro"."updatedAt", "aro2"."updatedAt")) "updatedAt",
                    ARRAY_AGG(DISTINCT "aro".id ORDER by "aro".id) "toRemove",
                    (ARRAY_AGG(DISTINCT "aro2".id))[1] "toUpdate"
                    FROM "ActivityReportObjectives" aro
                    JOIN  otmm_recast otmm
                    ON "aro"."objectiveId" = to_remove
                    LEFT JOIN "ActivityReportObjectives" aro2
                    ON "aro2"."objectiveId" = otmm."toUpdate"
                    AND "aro"."activityReportId" = "aro2"."activityReportId"
                    LEFT JOIN "ActivityReportObjectives" arox
                        ON "aro"."activityReportId" = arox."activityReportId"
                        AND (
                            arox."objectiveId" = "aro"."objectiveId"
                            OR otmm."toUpdate" = arox."objectiveId"
                        )
                    GROUP BY 1,2,3,4
                    );

        -- Validate Handle ActivityReportObjectivesToModify
        -- SELECT * FROM "ActivityReportObjectivesToModify";
        -- SELECT "activityReportId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportObjectivesToModify" ofmm
        -- GROUP BY "activityReportId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ActivityReportObjectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertActivityReportObjectives";
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
            TRIM(title) title,
            status,
            "ttaProvided",
            "arOrder",
            "createdAt",
            "updatedAt"
            FROM "ActivityReportObjectivesToModify" oftm
            WHERE oftm."toUpdate" IS NULL AND oftm."objectiveId" IS NOT NULL
            RETURNING
            id "activityReportObjectiveId",
            "objectiveId",
            "activityReportId"
        )
        SELECT * FROM insert_activity_report_objectives;
        -- SELECT * FROM "InsertActivityReportObjectives";
        END;

        -- Handle ActivityReportObjectives Metadata tables
        
        DROP TABLE IF EXISTS "ActivityReportObjectivesToModifyMetadata";
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

        -- -- Validate Handle ActivityReportObjectivesToModifyMetadata
        -- SELECT * FROM "ActivityReportObjectivesToModifyMetadata";
        -- SELECT "objectiveId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportObjectivesToModifyMetadata" ofmm
        -- GROUP BY "objectiveId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        -- -- Validate  ActivityReportObjectiveFiles objectiveId null values

        -- WITH otmm_recast AS (
        --     SELECT *,
        --         UNNEST("toRemove") to_remove
        --     FROM "ActivityReportObjectivesToModifyMetadata"
        -- )
        -- SELECT *
        -- FROM "ActivityReportObjectiveFiles" arof
        -- JOIN otmm_recast arotmm
        -- ON arof."activityReportObjectiveId" = to_remove
        -- LEFT JOIN "ActivityReportObjectiveFiles" arof2
        -- ON arof2."activityReportObjectiveId" = arotmm."toUpdate"
        -- AND arof."fileId" = arof2."fileId";

        -- Handle ActivityReportObjectiveFiles
        DROP TABLE IF EXISTS "ActivityReportObjectiveFilesToModify";
        CREATE TEMP TABLE "ActivityReportObjectiveFilesToModify" AS (
            WITH otmm_recast AS (
            SELECT *,
                UNNEST("toRemove") to_remove
            FROM "ActivityReportObjectivesToModifyMetadata"
        )
            SELECT
            arotmm."toUpdate" "activityReportObjectiveId",
            arof."fileId",
            MIN(LEAST("arof"."createdAt", "arof2"."createdAt")) "createdAt",
            MAX(GREATEST("arof"."updatedAt", "arof2"."updatedAt")) "updatedAt",
            ARRAY_AGG(DISTINCT "arof".id ORDER by "arof".id) "toRemove",
            (ARRAY_AGG(DISTINCT "arof2".id))[1] "toUpdate"
            FROM "ActivityReportObjectiveFiles" arof
            JOIN otmm_recast arotmm
            ON arof."activityReportObjectiveId" = to_remove
            LEFT JOIN "ActivityReportObjectiveFiles" arof2
            ON arof2."activityReportObjectiveId" = arotmm."toUpdate"
            AND arof."fileId" = arof2."fileId"
            GROUP BY 1,2
        );

        -- Validate Handle ActivityReportObjectiveFilesToModify
        -- SELECT * FROM "ActivityReportObjectiveFilesToModify";
        -- SELECT "fileId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportObjectiveFilesToModify" ofmm
        -- GROUP BY "fileId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ActivityReportObjectiveFiles', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertActivityReportObjectiveFiles";
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
            WHERE aroftm."toUpdate" IS NULL and aroftm."activityReportObjectiveId" IS NOT NULL
            RETURNING
            id "activityReportObjectiveFileId",
            "activityReportObjectiveId"
        )
        SELECT * FROM insert_activity_report_objective_files;
        -- SELECT * FROM "InsertActivityReportObjectiveFiles";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportObjectiveFiles', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateActivityReportObjectiveFiles";
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
        -- SELECT * FROM "UpdateActivityReportObjectiveFiles";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ActivityReportObjectiveFiles', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteActivityReportObjectiveFiles";
        CREATE TEMP TABLE "DeleteActivityReportObjectiveFiles" AS
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ActivityReportObjectiveFilesToModify"
                ),
        delete_activity_report_objective_files AS (
            DELETE FROM "ActivityReportObjectiveFiles" "arof"
            USING otmm_recast aroftm
            WHERE "arof".id = to_remove
            RETURNING
            "arof".id "activityReportObjectiveFileId",
            "arof"."activityReportObjectiveId"
        )
        SELECT * FROM delete_activity_report_objective_files;
        -- SELECT * FROM "DeleteActivityReportObjectiveFiles";
        END;

        DROP TABLE IF EXISTS "ActivityReportObjectiveFileStats";
        CREATE TEMP TABLE "ActivityReportObjectiveFileStats" AS (
            SELECT
            'ActivityReportObjectiveFiles' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectiveFiles") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectiveFiles") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectiveFiles") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveFiles" arof) "post_count"
        );

        -- Handle ActivityReportObjectiveResources
        DROP TABLE IF EXISTS "ActivityReportObjectiveResourcesToModify";
        CREATE TEMP TABLE "ActivityReportObjectiveResourcesToModify" AS (
            WITH arotmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ActivityReportObjectivesToModifyMetadata"
                )
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
            JOIN  arotmm_recast arotmm
            ON aror."activityReportObjectiveId" = to_remove
            LEFT JOIN "ActivityReportObjectiveResources" aror2
            ON aror2."activityReportObjectiveId" = arotmm."toUpdate"
            AND aror."resourceId" = aror2."resourceId"
            GROUP BY 1,2
        );

        -- Validate Handle ActivityReportObjectiveResourcesToModify
        -- SELECT * FROM "ActivityReportObjectiveResourcesToModify";
        -- SELECT "resourceId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportObjectiveResourcesToModify" ofmm
        -- GROUP BY "resourceId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ActivityReportObjectiveResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertActivityReportObjectiveResources";
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
            WHERE arortm."toUpdate" IS NULL and arortm."activityReportObjectiveId" IS NOT NULL
            RETURNING
            id "activityReportObjectiveResourceId",
            "activityReportObjectiveId"
        )
        SELECT * FROM insert_activity_report_objective_resources;
        -- SELECT * FROM "InsertActivityReportObjectiveResources";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportObjectiveResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateActivityReportObjectiveResources";
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
        )
        SELECT * FROM update_activity_report_objective_resources;
        -- SELECT * FROM "UpdateActivityReportObjectiveResources";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ActivityReportObjectiveResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteActivityReportObjectiveResources";
        CREATE TEMP TABLE "DeleteActivityReportObjectiveResources" AS
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ActivityReportObjectiveResourcesToModify"
                ),
            delete_activity_report_objective_resources AS (
            DELETE FROM "ActivityReportObjectiveResources" "aror"
            USING otmm_recast arortm
            WHERE "aror".id = to_remove
            RETURNING
            "aror".id "activityReportObjectiveResourceId",
            "aror"."activityReportObjectiveId"
        )
        SELECT * FROM delete_activity_report_objective_resources;
        -- SELECT * FROM "DeleteActivityReportObjectiveResources";
        END;

        DROP TABLE IF EXISTS "ActivityReportObjectiveResourceStats";
        CREATE TEMP TABLE "ActivityReportObjectiveResourceStats" AS (
            SELECT
            'ActivityReportObjectiveResources' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectiveResources") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectiveResources") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectiveResources") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveResources" aror) "post_count"
        );

        -- Handle ActivityReportObjectiveTopics
        DROP TABLE IF EXISTS "ActivityReportObjectiveTopicsToModify";
        CREATE TEMP TABLE "ActivityReportObjectiveTopicsToModify" AS (
            WITH otmm_recast AS (
            SELECT *,
                UNNEST("toRemove") to_remove
            FROM "ActivityReportObjectivesToModifyMetadata"
        )
            SELECT
                arotmm."toUpdate" "activityReportObjectiveId",
                arot."topicId",
                MIN(LEAST("arot"."createdAt", "arot2"."createdAt")) "createdAt",
                MAX(GREATEST("arot"."updatedAt", "arot2"."updatedAt")) "updatedAt",
                ARRAY_AGG(DISTINCT "arot".id ORDER by "arot".id) "toRemove",
                MIN("arot2".id) "toUpdate"
            FROM "ActivityReportObjectiveTopics" arot
            JOIN otmm_recast arotmm
            ON arot."activityReportObjectiveId" = to_remove
            LEFT JOIN "ActivityReportObjectiveTopics" arot2
            ON arot2."activityReportObjectiveId" = arotmm."toUpdate"
            AND arot."topicId" = arot2."topicId"
            GROUP BY 1,2
        );

        -- Validate Handle ActivityReportObjectiveTopicsToModify
        -- SELECT * FROM "ActivityReportObjectiveTopicsToModify";
        -- SELECT "topicId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportObjectiveTopicsToModify" ofmm
        -- GROUP BY "topicId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ActivityReportObjectiveTopics', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertActivityReportObjectiveTopics";
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
            WHERE arottm."toUpdate" IS NULL AND arottm."activityReportObjectiveId" IS NOT NULL 
            RETURNING
            id "activityReportObjectiveTopicId",
            "activityReportObjectiveId"
        )
        SELECT * FROM insert_activity_report_objective_topics;
        -- SELECT * FROM "InsertActivityReportObjectiveTopics";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportObjectiveTopics', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateActivityReportObjectiveTopics";
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
        )
        SELECT * FROM update_activity_report_objective_topics;
        -- SELECT * FROM "UpdateActivityReportObjectiveTopics";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ActivityReportObjectiveTopics', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteActivityReportObjectiveTopics";
        CREATE TEMP TABLE "DeleteActivityReportObjectiveTopics" AS
            WITH otmm_recast AS (
            SELECT *,
                UNNEST("toRemove") to_remove
            FROM "ActivityReportObjectiveTopicsToModify"
            ),
            delete_activity_report_objective_topics AS (
                DELETE FROM "ActivityReportObjectiveTopics" "arot"
                USING otmm_recast arottm
                WHERE "arot".id = to_remove
                RETURNING
                "arot".id "activityReportObjectiveTopicId",
                "arot"."activityReportObjectiveId"
            )
            SELECT * FROM delete_activity_report_objective_topics;
        -- SELECT * FROM "DeleteActivityReportObjectiveTopics";
        END;

        DROP TABLE IF EXISTS "ActivityReportObjectiveTopicStats";
        CREATE TEMP TABLE "ActivityReportObjectiveTopicStats" AS (
            SELECT
            'ActivityReportObjectiveTopics' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectiveTopics") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectiveTopics") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectiveTopics") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectiveTopics" arot) "post_count"

        );

        -- Continue Handle ActivityReportObjectives
        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportObjectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateActivityReportObjectives";
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
        )
        SELECT * FROM update_activity_report_objectives;
        -- SELECT * FROM "UpdateActivityReportObjectives";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ActivityReportObjectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteActivityReportObjectives";
        CREATE TEMP TABLE "DeleteActivityReportObjectives" AS
        WITH otmm_recast AS (
            SELECT *,
                UNNEST("toRemove") to_remove
            FROM "ActivityReportObjectivesToModify"
        ),
        -- Delete related rows from ActivityReportObjectiveFiles table
        deleted_arof AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING otmm_recast arotm
            WHERE arof."activityReportObjectiveId" = to_remove
            RETURNING arof."activityReportObjectiveId"
        ),
        -- Delete rows from ActivityReportObjectives table
        deleted_aro AS (
            DELETE FROM "ActivityReportObjectives" "aro"
            USING otmm_recast arotm
            WHERE "aro".id = to_remove
            RETURNING
                "aro".id "activityReportObjectiveId",
                "aro"."objectiveId"
        )
        SELECT * FROM deleted_aro;
        -- SELECT * FROM "DeleteActivityReportObjectives";
        END;

        DROP TABLE IF EXISTS "ActivityReportObjectiveStats";
        CREATE TEMP TABLE "ActivityReportObjectiveStats" AS (
            SELECT
            'ActivityReportObjectives' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportObjectives") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportObjectives") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportObjectives") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportObjectives" aro) "post_count"
        );

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_Objectives', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteObjectives";
        CREATE TEMP TABLE "DeleteObjectives" AS
        WITH otm_recast AS (
          SELECT *,
            UNNEST("toRemove") to_remove
            FROM "ObjectivesToModify"
            ),
        -- Delete related rows from ActivityReportObjectiveFiles table
        deleted_arof AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING "ActivityReportObjectives" aro, otm_recast
            WHERE aro."objectiveId" = to_remove AND arof."activityReportObjectiveId" = aro.id
            RETURNING arof."activityReportObjectiveId"
        ),
        -- Delete related rows from ActivityReportObjectives table
        deleted_aro AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING otm_recast
            WHERE aro."objectiveId" = to_remove
            RETURNING aro."objectiveId"
        ),

        deleted_of AS (
            DELETE FROM "ObjectiveFiles" of
            USING otm_recast
            WHERE of."objectiveId" = to_remove
            RETURNING of."objectiveId"
        ),
        -- Delete rows from Objectives table
        deleted_o AS (
            DELETE FROM "Objectives" "o"
            USING otm_recast
            WHERE "o".id = to_remove
            RETURNING
                "o".id "objectiveId"
        )
        SELECT * FROM deleted_o;
        -- SELECT * FROM "DeleteObjectives";
        END;

        DROP TABLE IF EXISTS "ObjectiveStats";
        CREATE TEMP TABLE "ObjectiveStats" AS (
            SELECT
            'Objectives' "table",
            (SELECT COUNT(*) FROM "InsertObjectives") "Inserts",
            (SELECT COUNT(*) FROM "UpdateObjectives") "Updates",
            (SELECT COUNT(*) FROM "DeleteObjectives") "Deletes",
            (SELECT COUNT(*) FROM "Objectives" o) "post_count"
        );

        -- Handle ActivityReportGoals
        DROP TABLE IF EXISTS "ActivityReportGoalsToModify";
        CREATE TEMP TABLE "ActivityReportGoalsToModify" AS (
            SELECT
            dgoa."toUpdateGoal" "goalId",
            arg."activityReportId",
            TRIM(arg.name) "name",
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
            ON "arg"."goalId" = ANY(dgoa."toRemoveGoals")
            AND "arg"."goalId" != dgoa."toUpdateGoal"
            LEFT JOIN "ActivityReportGoals" "arg2"
            ON "arg2"."goalId" = dgoa."toUpdateGoal"
            AND "arg"."activityReportId" = "arg2"."activityReportId"
            GROUP BY 1,2,3,4,5,6,7
        );

        -- Validate Handle ActivityReportGoalsToModify
        -- SELECT * FROM "ActivityReportGoalsToModify";
        -- SELECT "goalId","activityReportId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportGoalsToModify" ofmm
        -- GROUP BY "goalId", "activityReportId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ActivityReportGoals', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertActivityReportGoals";
        CREATE TEMP TABLE "InsertActivityReportGoals" AS
        WITH insert_activity_report_goals AS (
            INSERT INTO "ActivityReportGoals"
            (
            "goalId",
            "activityReportId",
            "name",
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
            TRIM("name") "name",
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
            WHERE argtm."toUpdate" IS NULL AND argtm."activityReportId" IS NOT NULL
            RETURNING
            id "activityReportGoalId",
            "goalId",
            "activityReportId"
        )
        SELECT * FROM insert_activity_report_goals;
        -- SELECT * FROM "InsertActivityReportGoals";
        END;

        -- Handle ActivityReportGoals Metadata tables
        DROP TABLE IF EXISTS "ActivityReportGoalsToModifyMetadata";
        CREATE TEMP TABLE "ActivityReportGoalsToModifyMetadata" AS (
            SELECT
            argtm."goalId",
            argtm."activityReportId",
            TRIM(argtm.name) "name",
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

        -- Validate Handle ActivityReportGoalsToModifyMetadata
        -- SELECT * FROM "ActivityReportGoalsToModifyMetadata";
        -- SELECT "goalId", "activityReportId","toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportGoalsToModifyMetadata" ofmm
        -- GROUP BY "goalId", "activityReportId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        -- Handle ActivityReportGoalResources
        DROP TABLE IF EXISTS "ActivityReportGoalResourcesToModify";
        CREATE TEMP TABLE "ActivityReportGoalResourcesToModify" AS (
          WITH otm_recast AS (
          SELECT *,
            UNNEST("toRemove") to_remove
            FROM "ActivityReportGoalsToModifyMetadata"
            )
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
            JOIN otm_recast argtmm
            ON argr."activityReportGoalId" = to_remove
            LEFT JOIN "ActivityReportGoalResources" argr2
            ON argr2."activityReportGoalId" = argtmm."toUpdate"
            AND argr."resourceId" = argr2."resourceId"
            GROUP BY 1,2
        );

        -- Validate Handle ActivityReportGoalResourcesToModify
        -- SELECT * FROM "ActivityReportGoalResourcesToModify";
        -- SELECT "resourceId", "toRemove", "toUpdate", COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "ActivityReportGoalResourcesToModify" ofmm
        -- GROUP BY "resourceId", "toRemove", "toUpdate"
        -- HAVING COUNT(*) > 1;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Insert_ActivityReportGoalResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "InsertActivityReportGoalResources";
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
            WHERE argrtm."toUpdate" IS NULL AND argrtm."activityReportGoalId" IS NOT NULL
            RETURNING
            id "activityReportGoalResourceId",
            "activityReportGoalId"
        )
        SELECT * FROM insert_activity_report_goals_resources;
        -- SELECT * FROM "InsertActivityReportGoalResources";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportGoalResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateActivityReportGoalResources";
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
        )
        SELECT * FROM update_activity_report_goals_resources;
        -- SELECT * FROM "UpdateActivityReportGoalResources";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ActivityReportGoalResources', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteActivityReportGoalResources";
        CREATE TEMP TABLE "DeleteActivityReportGoalResources" AS
        WITH delete_activity_report_goals_resources AS (
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ActivityReportGoalResourcesToModify"
                )
            DELETE FROM "ActivityReportGoalResources" "argr"
            USING otmm_recast argrtm
            WHERE "argr".id = to_remove
            RETURNING
            "argr".id "activityReportGoalResourceId",
            "argr"."activityReportGoalId"
        )
        SELECT * FROM delete_activity_report_goals_resources;
        -- SELECT * FROM "DeleteActivityReportGoalResources";
        END;

        DROP TABLE IF EXISTS "ActivityReportGoalResourceStats";
        CREATE TEMP TABLE "ActivityReportGoalResourceStats" AS (
            SELECT
            'ActivityReportGoalResources' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportGoalResources") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportGoalResources") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportGoalResources") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportGoalResources" argr) "post_count"
        );

        -- Continue Handle ActivityReportGoals
        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_ActivityReportGoals', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateActivityReportGoals";
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
        -- SELECT * FROM "UpdateActivityReportGoals";
        END;

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_ActivityReportGoals', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteActivityReportGoals";
        CREATE TEMP TABLE "DeleteActivityReportGoals" AS
            WITH otmm_recast AS (
                SELECT *,
                    UNNEST("toRemove") to_remove
                FROM "ActivityReportGoalsToModify"
                ),
            delete_activity_report_goals AS  (
            DELETE FROM "ActivityReportGoals" "arg"
            USING otmm_recast argtm
            WHERE "arg".id = to_remove
            RETURNING
            "arg".id "activityReportGoalId",
            "arg"."goalId"
        )
        SELECT * FROM delete_activity_report_goals;
        -- SELECT * FROM "DeleteActivityReportGoals";
        END;

        DROP TABLE IF EXISTS "ActivityReportGoalStats";
        CREATE TEMP TABLE "ActivityReportGoalStats" AS (
            SELECT
            'ActivityReportGoals' "table",
            (SELECT COUNT(*) FROM "InsertActivityReportGoals") "Inserts",
            (SELECT COUNT(*) FROM "UpdateActivityReportGoals") "Updates",
            (SELECT COUNT(*) FROM "DeleteActivityReportGoals") "Deletes",
            (SELECT COUNT(*) FROM "ActivityReportGoals" ar) "post_count"

        );
        -- Continue Handle Goals

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Update_Goals', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "UpdateGoals";
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
        )
        SELECT * FROM update_goals;
        -- SELECT * FROM "UpdateGoals";
        END;

        -- Validate Handle GoalsToModify
        -- SELECT * FROM "Goals";
        -- SELECT *, COUNT(*), array_to_json(array_agg(row_to_json(ofmm)))
        -- FROM "Goals" ofmm
        -- GROUP BY "id"
        -- HAVING COUNT(*) > 1;

        -- DROP TABLE IF EXISTS "ViolatingDeleteGoals";
        -- CREATE TEMP TABLE "ViolatingDeleteGoals" AS
        -- WITH gtm_recast AS (
        -- SELECT *,
        --     UNNEST("toRemove") to_remove
        -- FROM "GoalsToModify"
        -- ),
        -- -- Identify rows violating foreign key constraints in ActivityReportObjectiveFiles table
        -- violated_arof AS (
        --     SELECT 'ActivityReportObjectiveFiles' as table_name, 
        --         arof.id as primary_key,
        --         arof."activityReportObjectiveId" as foreign_key, 
        --         o.id as objective_id, 
        --         array_to_json(array_agg(row_to_json(om))) as raw_objective,
        --         array_to_json(array_agg(row_to_json(ofmm))) as raw_goal
        --     FROM "ActivityReportObjectiveFiles" arof
        --     LEFT JOIN "ActivityReportObjectives" aro ON arof."activityReportObjectiveId" = aro.id
        --     LEFT JOIN "Objectives" o ON aro."objectiveId" = o.id
        --     LEFT JOIN gtm_recast ON o."goalId" = to_remove
        --     LEFT JOIN "Goals" ofmm ON ofmm.id = to_remove
        --     LEFT JOIN "Objectives" om ON om.id = o.id
        --     WHERE to_remove IS NOT NULL
        --     GROUP BY arof.id, arof."activityReportObjectiveId", o.id
        -- ),

        -- -- Identify rows violating foreign key constraints in ActivityReportObjectives table
        -- violated_aro AS (
        --     SELECT 'ActivityReportObjectives' as table_name, 
        --         aro.id as primary_key, 
        --         aro."objectiveId" as foreign_key, 
        --         to_remove as goal_id, 
        --         array_to_json(array_agg(row_to_json(ofmm))) as raw_goal, 
        --         array_to_json(array_agg(row_to_json(o))) as raw_objective
        --     FROM "ActivityReportObjectives" aro
        --     LEFT JOIN "Objectives" o ON aro."objectiveId" = o.id
        --     LEFT JOIN gtm_recast ON o."goalId" = to_remove
        --     LEFT JOIN "Goals" ofmm ON ofmm.id = to_remove
        --     WHERE to_remove IS NOT NULL
        --     GROUP BY aro.id, aro."objectiveId", to_remove
        -- ),
        -- -- Identify rows violating foreign key constraints in ObjectiveFiles table
        -- violated_of AS (
        --     SELECT 'ObjectiveFiles' as table_name, 
        --         of.id as primary_key, 
        --         of."objectiveId" as foreign_key, 
        --         to_remove as goal_id, 
        --         array_to_json(array_agg(row_to_json(ofmm))) as raw_goal, 
        --         array_to_json(array_agg(row_to_json(o))) as raw_objective
        --     FROM "ObjectiveFiles" of
        --     LEFT JOIN "Objectives" o ON of."objectiveId" = o.id
        --     LEFT JOIN gtm_recast ON o."goalId" = to_remove
        --     LEFT JOIN "Goals" ofmm ON ofmm.id = to_remove
        --     WHERE to_remove IS NOT NULL
        --     GROUP BY of.id, of."objectiveId", to_remove
        -- ),
        -- -- Identify rows violating foreign key constraints in Objectives table
        -- violated_o AS (
        --     SELECT 'Objectives' as table_name, 
        --         o.id as primary_key,
        --         o."goalId" as foreign_key, 
        --         to_remove as goal_id, 
        --         array_to_json(array_agg(row_to_json(ofmm))) as raw_goal,
        --         array_to_json(array_agg(row_to_json(o))) as raw_objective
        --     FROM "Objectives" o
        --     LEFT JOIN gtm_recast ON o."goalId" = to_remove
        --     LEFT JOIN "Goals" ofmm ON ofmm.id = to_remove
        --     WHERE to_remove IS NOT NULL
        --     GROUP BY o.id, o."goalId", to_remove
        -- ),
        -- -- Identify rows violating foreign key constraints in ActivityReportGoals table
        -- violated_arg AS (
        --     SELECT 'ActivityReportGoals' as table_name, 
        --         arg.id as primary_key,
        --         arg."goalId" as foreign_key, 
        --         to_remove as goal_id,
        --         array_to_json(array_agg(row_to_json(ofmm))) as raw_goal, 
        --         array_to_json(array_agg(row_to_json(o))) as raw_objective
        --     FROM "ActivityReportGoals" arg
        --     LEFT JOIN "Objectives" o ON o."goalId" = arg."goalId"
        --     LEFT JOIN gtm_recast ON arg."goalId" = to_remove
        --     LEFT JOIN "Goals" ofmm ON ofmm.id = to_remove
        --     WHERE to_remove IS NOT NULL
        --     GROUP BY arg.id, arg."goalId", to_remove
        -- )

        -- -- Display rows violating foreign key constraints
        -- SELECT * FROM violated_arof
        -- UNION ALL
        -- SELECT * FROM violated_aro
        -- UNION ALL
        -- SELECT * FROM violated_of
        -- UNION ALL
        -- SELECT * FROM violated_o
        -- UNION ALL
        -- SELECT * FROM violated_arg;
        -- SELECT * FROM "ViolatingDeleteGoals";

        BEGIN;
        SELECT set_config('audit.auditDescriptor', 'dup_goals_Delete_Goals', TRUE) as "auditDescriptor";
        DROP TABLE IF EXISTS "DeleteGoals";
        CREATE TEMP TABLE "DeleteGoals" AS
        WITH gtm_recast AS (
          SELECT *,
            UNNEST("toRemove") to_remove
          FROM "GoalsToModify"
          ),
        -- Delete related rows from ActivityReportObjectives table
        deleted_arof AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING "Objectives" o, gtm_recast, "ActivityReportObjectives" aro
            WHERE o."goalId" = to_remove AND aro."objectiveId" = o.id AND arof."activityReportObjectiveId" = aro.id
            RETURNING arof."activityReportObjectiveId"
        ),
        -- Delete related rows from ActivityReportObjectives table
        deleted_aro AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING "Objectives" o, gtm_recast
            WHERE o."goalId" = to_remove AND aro."objectiveId" = o.id
            RETURNING aro."objectiveId"
        ),
        -- Delete related rows from ObjectiveFiles table
        deleted_of AS (
            DELETE FROM "ObjectiveFiles" of
            USING "Objectives" o, gtm_recast
            WHERE o."goalId" = to_remove AND of."objectiveId" = o.id
            RETURNING of."objectiveId"
        ),
        -- Delete related rows from Objectives table
        deleted_o AS (
            DELETE FROM "Objectives" o
            USING gtm_recast
            WHERE o."goalId" = to_remove
            RETURNING o."goalId"
        ),
        -- Delete related rows from ActivityReportGoals table
        deleted_arg AS (
            DELETE FROM "ActivityReportGoals" arg
            USING gtm_recast
            WHERE arg."goalId" = to_remove
            RETURNING arg."goalId"
        ),
        -- Delete rows from Goals table
        deleted_g AS (
            DELETE FROM "Goals" "g"
            USING gtm_recast
            WHERE "g".id = to_remove
            RETURNING
                "g".id "goalId"
        )

        -- Display deleted rows from Goals table
        SELECT * FROM deleted_g;
        -- SELECT * FROM "DeleteGoals";
        END;

        -- Stats

        DROP TABLE IF EXISTS "GoalStats";
        CREATE TEMP TABLE "GoalStats" AS (
            SELECT
            'Goals' "table",
            0 "Inserts",
            (SELECT COUNT(*) FROM "UpdateGoals") "Updates",
            (SELECT COUNT(*) FROM "DeleteGoals") "Deletes",
            (SELECT COUNT(*) FROM "Goals" g) "post_count"
        );
        
        DROP TABLE IF EXISTS "PostCountStatsByRegion";
        CREATE TEMP TABLE "PostCountStatsByRegion" AS (
            SELECT
                gr."regionId",
                COUNT(DISTINCT g."id") "GoalsTotal",
                COUNT(DISTINCT arg."id") "ActivityReportGoalsTotal",
                COUNT(DISTINCT argr."id") "ActivityReportGoalResourcesTotal",
                COUNT(DISTINCT oj."id") "ObjectivesTotal",
                COUNT(DISTINCT ojf."id") "ObjectiveFilesTotal",
                COUNT(DISTINCT ojr."id") "ObjectiveResourcesTotal",
                COUNT(DISTINCT ojt."id") "ObjectiveTopicsTotal",
                COUNT(DISTINCT aro."id") "ActivityReportObjectivesTotal",
                COUNT(DISTINCT arof."id") "ActivityReportObjectiveFilesTotal",
                COUNT(DISTINCT aror."id") "ActivityReportObjectiveResourcesTotal",
                COUNT(DISTINCT arot."id") "ActivityReportObjectiveTopicsTotal"
            FROM "Grants" gr
            FULL OUTER JOIN "Goals" g ON gr."id" = g."grantId"
            FULL OUTER JOIN "ActivityReportGoals" arg ON g."id" = arg."goalId"
            FULL OUTER JOIN "ActivityReportGoalResources" argr ON arg."id" = argr."activityReportGoalId"
            FULL OUTER JOIN "Objectives" oj ON g."id" = oj."goalId"
            FULL OUTER JOIN "ObjectiveFiles" ojf ON oj."id" = ojf."objectiveId"
            FULL OUTER JOIN "ObjectiveResources" ojr ON oj."id" = ojr."objectiveId"
            FULL OUTER JOIN "ObjectiveTopics" ojt ON oj."id" = ojt."objectiveId"
            FULL OUTER JOIN "ActivityReportObjectives" aro ON oj."id" = aro."objectiveId"
            FULL OUTER JOIN "ActivityReportObjectiveFiles" arof ON aro."id" = arof."activityReportObjectiveId"
            FULL OUTER JOIN "ActivityReportObjectiveResources" aror ON aro."id" = aror."activityReportObjectiveId"
            FULL OUTER JOIN "ActivityReportObjectiveTopics" arot ON aro."id" = arot."activityReportObjectiveId"
            GROUP BY gr."regionId"
        );
        INSERT INTO "PostCountStatsByRegion"
        SELECT
            -1 "regionId",
            SUM("GoalsTotal"),
            SUM("ActivityReportGoalsTotal"),
            SUM("ActivityReportGoalResourcesTotal"),
            SUM("ObjectivesTotal"),
            SUM("ObjectiveFilesTotal"),
            SUM("ObjectiveResourcesTotal"),
            SUM("ObjectiveTopicsTotal"),
            SUM("ActivityReportObjectivesTotal"),
            SUM("ActivityReportObjectiveFilesTotal"),
            SUM("ActivityReportObjectiveResourcesTotal"),
            SUM("ActivityReportObjectiveTopicsTotal")
        FROM "PostCountStatsByRegion";
        SELECT * FROM "PostCountStatsByRegion";
        
        WITH "RegionDiffs" AS (
            SELECT
                pre."regionId",
                pre."GoalsTotal" - post."GoalsTotal" AS "GoalsTotalDiff",
                pre."ActivityReportGoalsTotal" - post."ActivityReportGoalsTotal" AS "ActivityReportGoalsTotalDiff",
                pre."ActivityReportGoalResourcesTotal" - post."ActivityReportGoalResourcesTotal" AS "ActivityReportGoalResourcesTotalDiff",
                pre."ObjectivesTotal" - post."ObjectivesTotal" AS "ObjectivesTotalDiff",
                pre."ObjectiveFilesTotal" - post."ObjectiveFilesTotal" AS "ObjectiveFilesTotalDiff",
                pre."ObjectiveResourcesTotal" - post."ObjectiveResourcesTotal" AS "ObjectiveResourcesTotalDiff",
                pre."ObjectiveTopicsTotal" - post."ObjectiveTopicsTotal" AS "ObjectiveTopicsTotalDiff",
                pre."ActivityReportObjectivesTotal" - post."ActivityReportObjectivesTotal" AS "ActivityReportObjectivesTotalDiff",
                pre."ActivityReportObjectiveFilesTotal" - post."ActivityReportObjectiveFilesTotal" AS "ActivityReportObjectiveFilesTotalDiff",
                pre."ActivityReportObjectiveResourcesTotal" - post."ActivityReportObjectiveResourcesTotal" AS "ActivityReportObjectiveResourcesTotalDiff",
                pre."ActivityReportObjectiveTopicsTotal" - post."ActivityReportObjectiveTopicsTotal" AS "ActivityReportObjectiveTopicsTotalDiff"
                
            FROM "PreCountStatsByRegion" pre
            JOIN "PostCountStatsByRegion" post ON pre."regionId" = post."regionId"
        )
        SELECT * FROM "RegionDiffs";
        
        WITH "CollectStats" AS (
            SELECT 1 id, *,
                (SELECT SUM("GoalsTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "GoalStats"
            UNION
            SELECT 2 id, *,
                (SELECT SUM("ActivityReportGoalsTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ActivityReportGoalStats"
            UNION
            SELECT 3 id, *,
                (SELECT SUM("ActivityReportGoalResourcesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ActivityReportGoalResourceStats"
            UNION
            SELECT 4 id, *,
                (SELECT SUM("ObjectivesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ObjectiveStats"
            UNION
            SELECT 5 id, *,
                (SELECT SUM("ObjectiveFilesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ObjectiveFileStats"
            UNION
            SELECT 6 id, *,
                (SELECT SUM("ObjectiveResourcesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ObjectiveResourceStats"
            UNION
            SELECT 7 id, *,
                (SELECT SUM("ObjectiveTopicsTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ObjectiveTopicStats"
            UNION
            SELECT 8 id, *,
                (SELECT SUM("ActivityReportObjectivesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ActivityReportObjectiveStats"
            UNION
            SELECT 9 id, *,
                (SELECT SUM("ActivityReportObjectiveFilesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ActivityReportObjectiveFileStats"
            UNION
            SELECT 10 id, *,
                (SELECT SUM("ActivityReportObjectiveResourcesTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ActivityReportObjectiveResourceStats"
            UNION
            SELECT 11 id, *,
                (SELECT SUM("ActivityReportObjectiveTopicsTotal") FROM "PreCountStatsByRegion" WHERE "regionId" = -1) AS pre_count
            FROM "ActivityReportObjectiveTopicStats"
        )
        SELECT *, 
            pre_count - post_count AS diff,
            post_count - (pre_count - "Deletes" + "Inserts") AS adjusted_diff

        FROM "CollectStats"
        ORDER BY id;
        DROP TABLE IF EXISTS  "PreCountStatsByRegion" ;
          `,
          { transaction }
        )
      } catch (err) {
        console.error(err) // eslint-disable-line no-console
        throw err
      }
    }),
  // Reverting the deletion is not possible, as the deleted records are lost
  down: () => {},
}
