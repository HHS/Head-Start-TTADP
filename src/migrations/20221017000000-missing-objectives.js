module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
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
        // 1. Identify all reports with inconsistencies between recipients and connected goals and
        // objectives
        // 2. Identify and create missing goals
        // 3. Identify and create missing ActivityReportGoals
        // 4. Validate and update onApprovedAR for goals
        // 5. Identify missing objectives.
        // 7. Create missing objectives.
        // 8. Create missing ActivityReportObjectives and metadata
        // 9. Validate and update onApprovedAR for Objectives.
        await queryInterface.sequelize.query(
          `----------------------------------------------------------------------------------------------------
          -- 1. Create ActivityReportGoals for each of the goals linked via ActivityReportObjectives
          -----------------------------------------------------------------------------------------------------
          WITH
            "GoalsThroughObjectives" AS (
              SELECT DISTINCT
                aro."activityReportId",
                o."goalId",
                g."grantId",
                md5(g."name") "goalHash"
              FROM "ActivityReportObjectives" aro
              JOIN "Objectives" o
              ON aro."objectiveId" = o.id
              JOIN "Goals" g
              ON o."goalId" = g.id
              WHERE o."goalId" IS NOT NULL
            ),
            "GoalsDirect" AS (
              SELECT DISTINCT
                arg."activityReportId",
                arg."goalId",
                g."grantId",
                md5(g."name") "goalHash"
              FROM "ActivityReportGoals" arg
              JOIN "Goals" g
              ON arg."goalId" = g.id
            ),
            "MissingDirectGoals" AS (
              SELECT *
              FROM "GoalsThroughObjectives"
              EXCEPT
              SELECT *
              FROM "GoalsDirect"
            )
            INSERT INTO "ActivityReportGoals"
            (
              "activityReportId",
              "goalId",
              "createdAt",
              "updatedAt"
            )
            SELECT DISTINCT
              aro."activityReportId",
              o."goalId",
              MIN(aro."createdAt") "createdAt",
              MAX(aro."updatedAt") "updatedAt"
            FROM "ActivityReportObjectives" aro
            LEFT JOIN "Objectives" o
            ON aro."objectiveId" = o.id
            LEFT JOIN "Goals" g
            ON o."goalId" = g.id
            JOIN "MissingDirectGoals" m
            ON aro."activityReportId" = m."activityReportId"
            AND o."goalId" = m."goalId"
            AND g."grantId" = m."grantId"
            LEFT JOIN "ActivityReportGoals" arg
            ON arg."activityReportId" = aro."activityReportId"
            AND arg."goalId" = o."goalId"
            WHERE arg.id IS NULL
            GROUP BY
              aro."activityReportId",
              o."goalId";

          ----------------------------------------------------------------------------------------------------
          -- 2. Identify all reports with inconsistencies between recipients and connected goals and objectives
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_incomplete_reports";
          CREATE TEMP TABLE "temp_incomplete_reports" AS
          WITH
            "through_goals" AS (
              SELECT
                ar."activityReportId",
                a."calculatedStatus",
                array_agg(distinct ar."grantId" order by ar."grantId") "recipientGrantIds",
                array_agg(distinct g."grantId" order by g."grantId") "goalGrantIds",
                array[]::text[] "distinctObjectives",
                array_agg(distinct md5(g.name) order by md5(g.name)) "distinctGoals"
                FROM "ActivityRecipients" ar
                JOIN "ActivityReports" a
                ON ar."activityReportId" = a.id
              JOIN "Grants" gr
              ON ar."grantId" = gr.id
              AND a."startDate" < gr."endDate"
              LEFT JOIN "ActivityReportGoals" arg
              ON ar."activityReportId" = arg."activityReportId"
              LEFT JOIN "Goals" g
              ON arg."goalId" = g.id
              JOIN "Grants" gr2
              ON g."grantId" = gr2.id
              AND a."startDate" < gr2."endDate"
              WHERE g."grantId" is not null
              GROUP BY ar."activityReportId", a."calculatedStatus"
              HAVING
              array_agg(distinct ar."grantId" order by ar."grantId") != array_agg(distinct g."grantId" order by g."grantId")
              AND ARRAY_LENGTH(ARRAY(
                SELECT UNNEST(array_agg(distinct ar."grantId" order by ar."grantId"))
                INTERSECT
                SELECT UNNEST(array_agg(distinct g."grantId" order by g."grantId"))
              ),1) > 0
            ),
            "through_objectives" AS (
              SELECT
                ar."activityReportId",
                a."calculatedStatus",
                array_agg(distinct ar."grantId" order by ar."grantId") "recipientGrantIds",
                array_agg(distinct g."grantId" order by g."grantId") "goalGrantIds",
                array_agg(distinct md5(o.title) order by md5(o.title)) "distinctObjectives",
                array_agg(distinct md5(g.name) order by md5(g.name)) "distinctGoals"
              FROM "ActivityRecipients" ar
                JOIN "ActivityReports" a
                ON ar."activityReportId" = a.id
              JOIN "Grants" gr
              ON ar."grantId" = gr.id
              AND a."startDate" < gr."endDate"
              LEFT JOIN "ActivityReportObjectives" aro
              ON ar."activityReportId" = aro."activityReportId"
              LEFT JOIN "Objectives" o
              ON aro."objectiveId" = o.id
              LEFT JOIN "Goals" g
              ON o."goalId" = g.id
              JOIN "Grants" gr2
              ON g."grantId" = gr2.id
              AND a."startDate" < gr2."endDate"
              WHERE g."grantId" is not null
              GROUP BY ar."activityReportId", a."calculatedStatus"
              HAVING
                array_agg(distinct ar."grantId" order by ar."grantId") != array_agg(distinct g."grantId" order by g."grantId")
                AND ARRAY_LENGTH(ARRAY(
                  SELECT UNNEST(array_agg(distinct ar."grantId" order by ar."grantId"))
                  INTERSECT
                  SELECT UNNEST(array_agg(distinct g."grantId" order by g."grantId"))
                ),1) > 0
            ),
            "through_both_unmerged" AS (
              SELECT *
              FROM "through_goals"
              UNION
              SELECT *
              FROM "through_objectives"
            ),
            "through_both" AS (
              SELECT
                tbu."activityReportId",
                tbu."calculatedStatus",
                ARRAY_AGG(DISTINCT w.v) "recipientGrantIds",
                ARRAY_AGG(DISTINCT x.v) "goalGrantIds",
                ARRAY_AGG(DISTINCT y.v) "distinctObjectives",
                ARRAY_AGG(DISTINCT z.v) "distinctGoals"
              FROM "through_both_unmerged" tbu
              CROSS JOIN LATERAL UNNEST(tbu."recipientGrantIds") AS w(v)
              CROSS JOIN LATERAL UNNEST(tbu."goalGrantIds") AS x(v)
              CROSS JOIN LATERAL UNNEST(tbu."distinctObjectives") AS y(v)
              CROSS JOIN LATERAL UNNEST(tbu."distinctGoals") AS z(v)
              GROUP BY tbu."activityReportId", "calculatedStatus"
              ORDER BY tbu."activityReportId"
            )
            SELECT
              *,
              ARRAY(SELECT UNNEST("recipientGrantIds") INTERSECT SELECT UNNEST("goalGrantIds")) "intersectionGrantId",
              ARRAY(SELECT UNNEST("recipientGrantIds") EXCEPT SELECT UNNEST("goalGrantIds")) "onlyRecipientGrantId",
              ARRAY(SELECT UNNEST("goalGrantIds") EXCEPT SELECT UNNEST("recipientGrantIds")) "onlyGoalGrantId"
            FROM "through_both";

          -----------------------------------------------------------------------------------------------------
          -- 3. Identify missing goals.
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_missing_goals";
          CREATE TEMP TABLE "temp_missing_goals" AS
          SELECT
            ir."activityReportId",
            md5(g.name) "goalHash",
            g.name "name",
            CASE
              WHEN 'Closed' = ANY(ARRAY_AGG(DISTINCT g.status)) THEN 'Closed'
              WHEN 'Suspended' = ANY(ARRAY_AGG(DISTINCT g.status)) THEN 'Suspended'
              WHEN 'In Progress' = ANY(ARRAY_AGG(DISTINCT g.status)) THEN 'In Progress'
              WHEN 'Not Started' = ANY(ARRAY_AGG(DISTINCT g.status)) THEN 'Not Started'
            END status,
            (ARRAY_AGG(g.timeframe ORDER BY g.id desc))[1] timeframe,
            bool_or(g."isFromSmartsheetTtaPlan")  "isFromSmartsheetTtaPlan",
            MIN(g."createdAt") "createdAt",
            MAX(g."updatedAt") "updatedAt",
            ARRAY_AGG(g."closeSuspendReason" ORDER BY g.id) "closeSuspendReason",
            ARRAY_AGG(g."closeSuspendContext" ORDER BY g.id) "closeSuspendContext",
            MIN(g."endDate") "endDate",
            ARRAY_AGG(g."previousStatus") "previousStatus",
            MIN(g."goalTemplateId") "goalTemplateId",
            MIN(g."grantId") "grantId",
            bool_or(g."onApprovedAR") "onApprovedAR",
            MIN(g."firstNotStartedAt") "firstNotStartedAt",
            MAX(g."lastNotStartedAt") "lastNotStartedAt",
            MIN(g."firstInProgressAt") "firstInProgressAt",
            MAX(g."lastInProgressAt") "lastInProgressAt",
            MIN(g."firstCeasedSuspendedAt") "firstCeasedSuspendedAt",
            MAX(g."lastCeasedSuspendedAt") "lastCeasedSuspendedAt",
            MIN(g."firstClosedAt") "firstClosedAt",
            MAX(g."lastClosedAt") "lastClosedAt",
            MIN(g."firstCompletedAt") "firstCompletedAt",
            MAX(g."lastCompletedAt") "lastCompletedAt"
          FROM "temp_incomplete_reports" ir
          JOIN "ActivityReportGoals" arg
          ON ir."activityReportId" = arg."activityReportId"
          JOIN "Goals" g
          ON arg."goalId" = g.id
          AND g."grantId" = ANY(ir."intersectionGrantId")
          AND md5(g.name) = ANY(ir."distinctGoals")
          GROUP BY
            ir."activityReportId",
            g.name;

          -----------------------------------------------------------------------------------------------------
          -- 4. Find missing goals for the grants identified that already exist
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_missing_goals_already_exist";
          CREATE TEMP TABLE "temp_missing_goals_already_exist" AS
          SELECT DISTINCT
            g.id "goalId"
          FROM "temp_incomplete_reports" ir
          CROSS JOIN unnest(ir."onlyRecipientGrantId") orgi("grantId")
          JOIN "temp_missing_goals" mg
          ON ir."activityReportId" = mg."activityReportId"
          AND mg."goalHash" = ANY(ir."distinctGoals")
          LEFT JOIN "Goals" g
          ON g."grantId" = orgi."grantId"
          AND md5(g.name) = mg."goalHash"
          WHERE g.id IS NOT NULL;

          -----------------------------------------------------------------------------------------------------
          -- 5. Create missing goals for the grants identified
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_missing_goals_added";
          CREATE TEMP TABLE "temp_missing_goals_added" AS
          WITH "inserted" AS (
            INSERT INTO "Goals"
            (
              name,
              status,
              timeframe,
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "closeSuspendContext",
              "endDate",
              "previousStatus",
              "goalTemplateId",
              "grantId",
              "onApprovedAR",
              "firstNotStartedAt",
              "lastNotStartedAt",
              "firstInProgressAt",
              "lastInProgressAt",
              "firstCeasedSuspendedAt",
              "lastCeasedSuspendedAt",
              "firstClosedAt",
              "lastClosedAt",
              "firstCompletedAt",
              "lastCompletedAt"
            )
            SELECT DISTINCT
              mg.name,
              mg.status,
              mg.timeframe,
              mg."isFromSmartsheetTtaPlan",
              mg."createdAt",
              mg."updatedAt",
              mg."closeSuspendReason"[1] "closeSuspendReason",
              mg."closeSuspendContext"[1] "closeSuspendContext",
              mg."endDate",
              mg."previousStatus"[1] "previousStatus",
              mg."goalTemplateId",
              orgi."grantId",
              mg."onApprovedAR",
              mg."firstNotStartedAt",
              mg."lastNotStartedAt",
              mg."firstInProgressAt",
              mg."lastInProgressAt",
              mg."firstCeasedSuspendedAt",
              mg."lastCeasedSuspendedAt",
              mg."firstClosedAt",
              mg."lastClosedAt",
              mg."firstCompletedAt",
              mg."lastCompletedAt"
            FROM "temp_incomplete_reports" ir
            CROSS JOIN unnest(ir."onlyRecipientGrantId") orgi("grantId")
            JOIN "temp_missing_goals" mg
            ON ir."activityReportId" = mg."activityReportId"
            AND mg."goalHash" = ANY(ir."distinctGoals")
            LEFT JOIN "Goals" g
            ON g."grantId" = orgi."grantId"
            AND md5(g.name) = mg."goalHash"
            WHERE g.id IS NULL
            RETURNING
              id "goalId"
          )
          SELECT
            "goalId"
          FROM "inserted";

          -----------------------------------------------------------------------------------------------------
          -- 6. Collect new and existing goals
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_missing_goals_added_and_existing";
          CREATE TEMP TABLE "temp_missing_goals_added_and_existing" AS
          SELECT *
          FROM "temp_missing_goals_already_exist"
          UNION
          SELECT *
          FROM "temp_missing_goals_added";

          -----------------------------------------------------------------------------------------------------
          -- 7. Create new ActivityReportGoals for added goals and found goals
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_missing_args_added";
          CREATE TEMP TABLE "temp_missing_args_added" AS
          WITH
            "inserted" AS (
              INSERT INTO "ActivityReportGoals"
              (
                "activityReportId",
                "goalId",
                "createdAt",
                "updatedAt"
              )
              SELECT DISTINCT
                ir."activityReportId",
                g.id "goalId",
                MIN(arg2."createdAt") "createdAt",
                MAX(arg2."updatedAt") "updatedAt"
              FROM "temp_missing_goals_added_and_existing" mga
              JOIN "Goals" g
              ON mga."goalId" = g.id
              JOIN "temp_incomplete_reports" ir
              ON g."grantId" = ANY(ir."onlyRecipientGrantId")
              AND md5(g.name) = ANY(ir."distinctGoals")
              LEFT JOIN "ActivityReportGoals" arg
              ON ir."activityReportId" = arg."activityReportId"
              AND g.id = arg."goalId"
              JOIN "ActivityReportGoals" arg2
              ON ir."activityReportId" = arg2."activityReportId"
              JOIN "Goals" g2
              ON arg2."goalId" = g2.id
              AND g2."grantId" = ANY(ir."intersectionGrantId")
              AND md5(g.name) = md5(g2.name)
              WHERE arg.id IS NULL
              GROUP BY
                ir."activityReportId",
                g.id
              RETURNING
                id "activityReportGoalId"
            )
            SELECT
              "activityReportGoalId"
            FROM "inserted";

          -----------------------------------------------------------------------------------------------------
          -- 8. Collect and calculate onApprovedAR for newly added goals
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_goals_now_on_approved_ar";
          CREATE TEMP TABLE "temp_goals_now_on_approved_ar" AS
          SELECT
            mga."goalId",
            'approved' = any(array_agg(distinct ar."calculatedStatus")) "onApprovedAR"
          FROM "temp_missing_goals_added_and_existing" mga
          JOIN "Goals" g
          ON mga."goalId" = g.id
          JOIN "ActivityReportGoals" arg
          ON mga."goalId" = arg."goalId"
          LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
          GROUP BY mga."goalId"
          HAVING bool_or(g."onApprovedAR") != ('approved' = any(array_agg(distinct ar."calculatedStatus")));

          -----------------------------------------------------------------------------------------------------
          -- 9. Update onApprovedAR for goals
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_goals_on_approved_ar_updated";
          CREATE TEMP TABLE "temp_goals_on_approved_ar_updated" AS
          WITH
            "updated" AS (
              UPDATE "Goals" g
              SET
                "onApprovedAR" = t."onApprovedAR"
              FROM "temp_goals_now_on_approved_ar" t
              WHERE g.id = t."goalId"
              RETURNING
                id "goalId"
            )
            SELECT
              "goalId"
            FROM "updated";

            -----------------------------------------------------------------------------------------------------
            -- 9. Identify missing objectives
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objectives";
            CREATE TEMP TABLE "temp_missing_objectives" AS
            SELECT
              ir."activityReportId",
              md5(o.title) "objectiveHash",
              ARRAY_AGG(DISTINCT md5(g.name)) "goalHashs",
              MIN(o.id) "objectiveId",
              o.title,
              o.status,
              MIN(o."createdAt") "createdAt",
              MIN(o."updatedAt") "updatedAt",
              MIN(o."objectiveTemplateId") "objectiveTemplateId",
              MIN(o."otherEntityId") "otherEntityId",
              BOOL_OR(o."onApprovedAR") "onApprovedAR",
              MIN(o."firstNotStartedAt") "firstNotStartedAt",
              MIN(o."lastNotStartedAt") "lastNotStartedAt",
              MIN(o."firstInProgressAt") "firstInProgressAt",
              MIN(o."lastInProgressAt") "lastInProgressAt",
              MIN(o."firstCompleteAt") "firstCompleteAt",
              MIN(o."lastCompleteAt") "lastCompleteAt",
              MIN(o."firstSuspendedAt") "firstSuspendedAt",
              MIN(o."lastSuspendedAt") "lastSuspendedAt"
            FROM "temp_incomplete_reports" ir
            JOIN "ActivityReportObjectives" aro
            ON ir."activityReportId" = aro."activityReportId"
            JOIN "Objectives" o
            ON aro."objectiveId" = o.id
            AND md5(o.title) = ANY(ir."distinctObjectives")
            JOIN "Goals" g
            ON o."goalId" = g.id
            AND g."grantId" = ANY(ir."intersectionGrantId")
            AND md5(g.name) = ANY(ir."distinctGoals")
            GROUP BY
              ir."activityReportId",
              o.title,
              o.status;

            -----------------------------------------------------------------------------------------------------
            -- 10. Find missing objectives for the grants identified that already exist
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objectives_already_exist";
            CREATE TEMP TABLE "temp_missing_objectives_already_exist" AS
            SELECT DISTINCT
              o.id "objectiveId"
            FROM "temp_incomplete_reports" ir
            CROSS JOIN unnest(ir."onlyRecipientGrantId") orgi("grantId")
            JOIN "temp_missing_objectives" mo
            ON ir."activityReportId" = mo."activityReportId"
            JOIN "Goals" g
            ON g."grantId" = orgi."grantId"
            AND md5(g.name) = ANY(mo."goalHashs")
            LEFT JOIN "Objectives" o
            ON g.id = o."goalId"
            and md5(o.title) = mo."objectiveHash"
            WHERE o.id IS NOT NULL;

            -----------------------------------------------------------------------------------------------------
            -- 12. Create missing objectives for the grants identified
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objectives_added";
            CREATE TEMP TABLE "temp_missing_objectives_added" AS
            WITH
              "inserted" AS (
                INSERT INTO "Objectives"
                (
                  "goalId",
                  title,
                  status,
                  "createdAt",
                  "updatedAt",
                  "objectiveTemplateId",
                  "otherEntityId",
                  "onApprovedAR",
                  "firstNotStartedAt",
                  "lastNotStartedAt",
                  "firstInProgressAt",
                  "lastInProgressAt",
                  "firstCompleteAt",
                  "lastCompleteAt",
                  "firstSuspendedAt",
                  "lastSuspendedAt"
                )
                SELECT DISTINCT
                  g.id "goalId",
                  mo.title,
                  mo.status,
                  mo."createdAt",
                  mo."updatedAt",
                  mo."objectiveTemplateId",
                  mo."otherEntityId",
                  mo."onApprovedAR",
                  mo."firstNotStartedAt",
                  mo."lastNotStartedAt",
                  mo."firstInProgressAt",
                  mo."lastInProgressAt",
                  mo."firstCompleteAt",
                  mo."lastCompleteAt",
                  mo."firstSuspendedAt",
                  mo."lastSuspendedAt"
                FROM "temp_incomplete_reports" ir
                CROSS JOIN unnest(ir."onlyRecipientGrantId") orgi("grantId")
                JOIN "temp_missing_objectives" mo
                ON ir."activityReportId" = mo."activityReportId"
                JOIN "Goals" g
                ON g."grantId" = orgi."grantId"
                AND md5(g.name) = ANY(mo."goalHashs")
                LEFT JOIN "Objectives" o
                ON g.id = o."goalId"
                and md5(o.title) = mo."objectiveHash"
                WHERE o.id IS NULL
                RETURNING
                  id "objectiveId"
              )
              SELECT
                "objectiveId"
              FROM "inserted";
            -----------------------------------------------------------------------------------------------------
            -- 13. Collect new and existing objectives
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objectives_added_and_existing";
            CREATE TEMP TABLE "temp_missing_objectives_added_and_existing" AS
            SELECT *
            FROM "temp_missing_objectives_already_exist"
            UNION
            SELECT *
            FROM "temp_missing_objectives_added";

            -----------------------------------------------------------------------------------------------------
            -- 14. Create new ActivityReportObjectives for added and found objectives
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_aros_added";
            CREATE TEMP TABLE "temp_missing_aros_added" AS
            WITH
              "inserted" AS (
                INSERT INTO "ActivityReportObjectives"
                (
                  "activityReportId",
                  "objectiveId",
                  "createdAt",
                  "updatedAt",
                  "ttaProvided"
                )
                SELECT
                  ir."activityReportId",
                  o.id "objectiveId",
                  MIN(aro2."createdAt") "createdAt",
                  MAX(aro2."updatedAt") "updatedAt",
                  ARRAY_AGG(aro2."ttaProvided")
                FROM "temp_missing_objectives_added_and_existing" moa
                JOIN "Objectives" o
                ON moa."objectiveId" = o.id
                JOIN "Goals" g
                ON o."goalId" = g.id
                JOIN "temp_incomplete_reports" ir
                ON g."grantId" = ANY(ir."onlyRecipientGrantId")
                AND md5(g.name) = ANY(ir."distinctGoals")
                AND md5(o.title) = ANY(ir."distinctObjectives")
                LEFT JOIN "ActivityReportObjectives" aro
                ON ir."activityReportId" = aro."activityReportId"
                AND o.id = aro."objectiveId"
                JOIN "ActivityReportObjectives" aro2
                ON ir."activityReportId" = aro2."activityReportId"
                JOIN "Objectives" o2
                ON aro2."objectiveId" = o2.id
                AND md5(o.title) = md5(o2.title)
                JOIN "Goals" g2
                ON o2."goalId" = g2.id
                AND g2."grantId" = ANY(ir."intersectionGrantId")
                AND md5(g.name) = md5(g2.name)
                WHERE aro.id IS NULL
                GROUP BY
                  ir."activityReportId",
                  o.id
                RETURNING
                  id "activityReportObjectiveId"
              )
              SELECT
                "activityReportObjectiveId"
              FROM "inserted";

            -----------------------------------------------------------------------------------------------------
            -- 15. Create new Objective files for added and found objectives
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objective_files";
            CREATE TEMP TABLE "temp_missing_objective_files" AS
            WITH
              "inserted" AS (
                INSERT INTO "ObjectiveFiles"
                (
                  "objectiveId",
                  "fileId",
                  "createdAt",
                  "updatedAt"
                )
                SELECT
                  o.id "objectiveId",
                  f2."fileId",
                  MIN(f2."createdAt") "createdAt",
                  MAX(f2."updatedAt") "updatedAt"
                FROM "temp_missing_objectives_added_and_existing" moa
                JOIN "Objectives" o
                ON moa."objectiveId" = o.id
                JOIN "Goals" g
                ON o."goalId" = g.id
                JOIN "temp_incomplete_reports" ir
                ON g."grantId" = ANY(ir."onlyRecipientGrantId")
                AND md5(g.name) = ANY(ir."distinctGoals")
                AND md5(o.title) = ANY(ir."distinctObjectives")
                LEFT JOIN "ObjectiveFiles" f
                ON o.id = f."objectiveId"
                LEFT JOIN "Goals" g2
                ON g2."grantId" = ANY(ir."intersectionGrantId")
                AND md5(g.name) = md5(g2.name)
                LEFT JOIN "Objectives" o2
                ON g2.id = o2."goalId"
                AND md5(o.title) = md5(o2.title)
                LEFT JOIN "ObjectiveFiles" f2
                ON o2.id = f2."objectiveId"
                WHERE f.id IS NULL
                AND f2."fileId" IS NOT NULL
                GROUP BY
                  o.id,
                  f2."fileId"
                RETURNING
                  id "objectiveFileId"
              )
              SELECT
                "objectiveFileId"
              FROM "inserted";

            -----------------------------------------------------------------------------------------------------
            -- 16. Create new Objective resources for added and found objectives
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objective_Resources";
            CREATE TEMP TABLE "temp_missing_objective_Resources" AS
            WITH
              "inserted" AS (
                INSERT INTO "ObjectiveResources"
                (
                  "objectiveId",
                  "userProvidedUrl",
                  "createdAt",
                  "updatedAt"
                )
                SELECT
                  o.id "objectiveId",
                  r2."userProvidedUrl",
                  MIN(r2."createdAt") "createdAt",
                  MAX(r2."updatedAt") "updatedAt"
                FROM "temp_missing_objectives_added_and_existing" moa
                JOIN "Objectives" o
                ON moa."objectiveId" = o.id
                JOIN "Goals" g
                ON o."goalId" = g.id
                JOIN "temp_incomplete_reports" ir
                ON g."grantId" = ANY(ir."onlyRecipientGrantId")
                AND md5(g.name) = ANY(ir."distinctGoals")
                AND md5(o.title) = ANY(ir."distinctObjectives")
                LEFT JOIN "ObjectiveResources" r
                ON o.id = r."objectiveId"
                LEFT JOIN "Goals" g2
                ON g2."grantId" = ANY(ir."intersectionGrantId")
                AND md5(g.name) = md5(g2.name)
                LEFT JOIN "Objectives" o2
                ON g2.id = o2."goalId"
                AND md5(o.title) = md5(o2.title)
                LEFT JOIN "ObjectiveResources" r2
                ON o2.id = r2."objectiveId"
                WHERE r.id IS NULL
                AND r2."userProvidedUrl" IS NOT NULL
                GROUP BY
                  o.id,
                  r2."userProvidedUrl"
                RETURNING
                  id "objectiveResourceId"
              )
              SELECT
                "objectiveResourceId"
              FROM "inserted";

            -----------------------------------------------------------------------------------------------------
            -- 17. Create new Objective Roles for added and found objectives
            -----------------------------------------------------------------------------------------------------
            DROP TABLE IF EXISTS "temp_missing_objective_Roles";
            CREATE TEMP TABLE "temp_missing_objective_Roles" AS
            WITH
              "inserted" AS (
                INSERT INTO "ObjectiveRoles"
                (
                  "objectiveId",
                  "roleId",
                  "createdAt",
                  "updatedAt"
                )
                SELECT
                  o.id "objectiveId",
                  r2."roleId",
                  MIN(r2."createdAt") "createdAt",
                  MAX(r2."updatedAt") "updatedAt"
                FROM "temp_missing_objectives_added_and_existing" moa
                JOIN "Objectives" o
                ON moa."objectiveId" = o.id
                JOIN "Goals" g
                ON o."goalId" = g.id
                JOIN "temp_incomplete_reports" ir
                ON g."grantId" = ANY(ir."onlyRecipientGrantId")
                AND md5(g.name) = ANY(ir."distinctGoals")
                AND md5(o.title) = ANY(ir."distinctObjectives")
                LEFT JOIN "ObjectiveRoles" r
                ON o.id = r."objectiveId"
                LEFT JOIN "Goals" g2
                ON g2."grantId" = ANY(ir."intersectionGrantId")
                AND md5(g.name) = md5(g2.name)
                LEFT JOIN "Objectives" o2
                ON g2.id = o2."goalId"
                AND md5(o.title) = md5(o2.title)
                LEFT JOIN "ObjectiveRoles" r2
                ON o2.id = r2."objectiveId"
                WHERE r.id IS NULL
                AND r2."roleId" IS NOT NULL
                GROUP BY
                  o.id,
                  r2."roleId"
                RETURNING
                  id "objectiveRoleId"
              )
              SELECT
                "objectiveRoleId"
              FROM "inserted";

          -----------------------------------------------------------------------------------------------------
          -- 18. Create new Objective Topics for added and found objectives
          -----------------------------------------------------------------------------------------------------
          DROP TABLE IF EXISTS "temp_missing_objective_Topics";
          CREATE TEMP TABLE "temp_missing_objective_Topics" AS
          WITH
            "inserted" AS (
              INSERT INTO "ObjectiveTopics"
              (
                "objectiveId",
                "topicId",
                "createdAt",
                "updatedAt"
              )
              SELECT
                o.id "objectiveId",
                t2."topicId",
                MIN(t2."createdAt") "createdAt",
                MAX(t2."updatedAt") "updatedAt"
              FROM "temp_missing_objectives_added_and_existing" moa
              JOIN "Objectives" o
              ON moa."objectiveId" = o.id
              JOIN "Goals" g
              ON o."goalId" = g.id
              JOIN "temp_incomplete_reports" ir
              ON g."grantId" = ANY(ir."onlyRecipientGrantId")
              AND md5(g.name) = ANY(ir."distinctGoals")
              AND md5(o.title) = ANY(ir."distinctObjectives")
              LEFT JOIN "ObjectiveTopics" t
              ON o.id = t."objectiveId"
              LEFT JOIN "Goals" g2
              ON g2."grantId" = ANY(ir."intersectionGrantId")
              AND md5(g.name) = md5(g2.name)
              LEFT JOIN "Objectives" o2
              ON g2.id = o2."goalId"
              AND md5(o.title) = md5(o2.title)
              LEFT JOIN "ObjectiveTopics" t2
              ON o2.id = t2."objectiveId"
              WHERE t.id IS NULL
              AND t2."topicId" IS NOT NULL
              GROUP BY
                o.id,
                t2."topicId"
              RETURNING
                id "objectiveTopicId"
            )
            SELECT
              "objectiveTopicId"
            FROM "inserted";

        -----------------------------------------------------------------------------------------------------
        -- 19. Collect and calculate onApprovedAR for objectives
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_objectives_now_on_approved_ar";
        CREATE TEMP TABLE "temp_objectives_now_on_approved_ar" AS
        SELECT
          moa."objectiveId",
          'approved' = any(array_agg(distinct ar."calculatedStatus")) "onApprovedAR"
        FROM "temp_missing_objectives_added_and_existing" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "ActivityReportObjectives" aro
        ON moa."objectiveId" = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        GROUP BY moa."objectiveId"
        HAVING bool_or(o."onApprovedAR") != ('approved' = any(array_agg(distinct ar."calculatedStatus")));

        -----------------------------------------------------------------------------------------------------
        -- 20. Update onApprovedAR for objectives
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_objectives_on_approved_ar_updated";
        CREATE TEMP TABLE "temp_objectives_on_approved_ar_updated" AS
        WITH
          "updated" AS (
            UPDATE "Objectives" o
            SET
              "onApprovedAR" = t."onApprovedAR"
            FROM "temp_objectives_now_on_approved_ar" t
            WHERE o.id = t."objectiveId"
            RETURNING
              id "objectiveId"
          )
          SELECT
            "objectiveId"
          FROM "updated";

        -----------------------------------------------------------------------------------------------------
        -- 21. Collect args to be deleted
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_args_to_be_deleted";
        CREATE TEMP TABLE "temp_args_to_be_deleted" AS
        SELECT DISTINCT
          arg.id
        FROM "temp_incomplete_reports" ir
        JOIN "Goals" g
        ON g."grantId" = ANY(ir."onlyGoalGrantId")
        AND md5(g."name") = ANY(ir."distinctGoals")
        JOIN "ActivityReportGoals" arg
        ON ir."activityReportId" = arg."activityReportId"
        AND g.id = arg."goalId";

        -----------------------------------------------------------------------------------------------------
        -- 22. Deleted args
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_args_deleted";
        CREATE TEMP TABLE "temp_args_deleted" AS
        WITH
          "deleted" AS (
            DELETE FROM "ActivityReportGoals" arg
            USING "temp_args_to_be_deleted" argd
            WHERE arg.id = argd.id
            RETURNING
              arg.id "argId"
          )
          SELECT
            "argId"
          FROM "deleted";

        -----------------------------------------------------------------------------------------------------
        -- 23. Collect aros to be deleted
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_aros_to_be_deleted";
        CREATE TEMP TABLE "temp_aros_to_be_deleted" AS
        SELECT DISTINCT
          aro.id
        FROM "temp_incomplete_reports" ir
        JOIN "Goals" g
        ON g."grantId" = ANY(ir."onlyGoalGrantId")
        AND md5(g."name") = ANY(ir."distinctGoals")
        JOIN "Objectives" o
        ON g.id = o."goalId"
        AND md5(o."title") = ANY(ir."distinctObjectives")
        JOIN "ActivityReportObjectives" aro
        ON ir."activityReportId" = aro."activityReportId"
        AND o.id = aro."objectiveId";

        -----------------------------------------------------------------------------------------------------
        -- 24. Delete aros
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_aros_deleted";
        CREATE TEMP TABLE "temp_aros_deleted" AS
        WITH
          "deleted" AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING "temp_aros_to_be_deleted" arod
            WHERE aro.id = arod.id
            RETURNING
              aro.id "aroId"
          )
          SELECT
            "aroId"
          FROM "deleted";

        -----------------------------------------------------------------------------------------------------
        -- 25. Collect objectives to be deleted
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_objectives_to_be_deleted";
        CREATE TEMP TABLE "temp_objectives_to_be_deleted" AS
        SELECT
          o.id
        FROM "temp_incomplete_reports" ir
        JOIN "Goals" g
        ON g."grantId" = ANY(ir."onlyGoalGrantId")
        AND md5(g."name") = ANY(ir."distinctGoals")
        JOIN "Objectives" o
        ON g.id = o."goalId"
        AND md5(o."title") = ANY(ir."distinctObjectives")
        LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
        WHERE aro.id IS NULL;

        -----------------------------------------------------------------------------------------------------
        -- 26. Collect objectives to be deleted
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_objectives_on_approved_ar";
        CREATE TEMP TABLE "temp_objectives_on_approved_ar" AS
        SELECT
          o.id,
          bool_or(ar."calculatedStatus" = 'approved') "onApprovedAR"
        FROM "temp_incomplete_reports" ir
        JOIN "Goals" g
        ON g."grantId" = ANY(ir."onlyGoalGrantId")
        AND md5(g."name") = ANY(ir."distinctGoals")
        JOIN "Objectives" o
        ON g.id = o."goalId"
        AND md5(o."title") = ANY(ir."distinctObjectives")
        LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
        JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        WHERE aro.id IS NOT NULL
        GROUP
          BY o.id
        HAVING
          bool_or(o."onApprovedAR") != ('approved' = any(array_agg(distinct ar."calculatedStatus")));

        -----------------------------------------------------------------------------------------------------
        -- 27. Delete Objectives
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_objectives_deleted";
        CREATE TEMP TABLE "temp_objectives_deleted" AS
        WITH
          "deleted" AS (
            DELETE FROM "Objectives" o
            USING "temp_objectives_to_be_deleted" od
            WHERE o.id = od.id
            RETURNING
              o.id "objectiveId"
          )
          SELECT
            "objectiveId"
          FROM "deleted";

        -----------------------------------------------------------------------------------------------------
        -- 28. Update onApprovedAR for objectives
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_objectives_on_approved_ar_updated2";
        CREATE TEMP TABLE "temp_objectives_on_approved_ar_updated2" AS
        WITH
          "updated" AS (
            UPDATE "Objectives" o
            SET "onApprovedAR" = t."onApprovedAR"
            FROM "temp_objectives_on_approved_ar" t
            WHERE o.id = t."id"
            RETURNING
              o.id "objectiveId"
          )
          SELECT
            "objectiveId"
          FROM "updated";

        -----------------------------------------------------------------------------------------------------
        -- 29. Collect goals to be deleted
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_goals_to_be_deleted";
        CREATE TEMP TABLE "temp_goals_to_be_deleted" AS
        SELECT g.id
        FROM "temp_incomplete_reports" ir
        JOIN "Goals" g
        ON g."grantId" = ANY(ir."onlyGoalGrantId")
        AND md5(g."name") = ANY(ir."distinctGoals")
        LEFT JOIN "Objectives" o
        ON g.id = o."goalId"
        LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
        WHERE arg.id IS NULL
        AND o.id IS NULL;

        -----------------------------------------------------------------------------------------------------
        -- 30. Collect and calculate onApprovedAR for goals
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_goals_on_approved_ar";
        CREATE TEMP TABLE "temp_goals_on_approved_ar" AS
        SELECT
          g.id,
          bool_or(ar."calculatedStatus" = 'approved') "onApprovedAR"
        FROM "temp_incomplete_reports" ir
        JOIN "Goals" g
        ON g."grantId" = ANY(ir."onlyGoalGrantId")
        AND md5(g."name") = ANY(ir."distinctGoals")
        LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
        JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        WHERE arg.id IS NOT NULL
        GROUP BY g.id
        HAVING bool_or(g."onApprovedAR") != ('approved' = any(array_agg(distinct ar."calculatedStatus")));

        -----------------------------------------------------------------------------------------------------
        -- 31. Delete goals
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_goals_deleted";
        CREATE TEMP TABLE "temp_goals_deleted" AS
        WITH
          "deleted" AS (
            DELETE FROM "Goals" g
            USING "temp_goals_to_be_deleted" gd
            WHERE g.id = gd.id
            RETURNING
              g.id "goalId"
          )
          SELECT
            "goalId"
          FROM "deleted";

        -----------------------------------------------------------------------------------------------------
        -- 32. Update onApprovedAR for goals
        -----------------------------------------------------------------------------------------------------
        DROP TABLE IF EXISTS "temp_goals_on_approved_ar_updated2";
        CREATE TEMP TABLE "temp_goals_on_approved_ar_updated2" AS
        WITH
          "updated" AS (
            UPDATE "Goals" g
            SET "onApprovedAR" = t."onApprovedAR"
            FROM "temp_goals_on_approved_ar" t
            WHERE g.id = t."id"
            RETURNING
              g.id "goalId"
          )
          SELECT
            "goalId"
          FROM "updated";


        -----------------------------------------------------------------------------------------------------
        -- 33. Output of some counts from steps above
        -----------------------------------------------------------------------------------------------------
        /*
        SELECT
        'incomplete_reports' "name",
        count(*) cnt
        FROM "temp_incomplete_reports"
        UNION
        SELECT
        'missing_goals_added' "name",
        count(*) cnt
        FROM "temp_missing_goals_added_and_existing"
        UNION
        SELECT
        'missing_args_added' "name",
        count(*) cnt
        FROM "temp_missing_args_added"
        UNION
        SELECT
        'goals_on_approved_ar_updated' "name",
        count(*) cnt
        FROM "temp_goals_on_approved_ar_updated"
        UNION
        SELECT
        'missing_objectives_added' "name",
        count(*) cnt
        FROM "temp_missing_objectives_added_and_existing"
        UNION
        SELECT
        'missing_aros_added' "name",
        count(*) cnt
        FROM "temp_missing_aros_added"
        UNION
        SELECT
        'objectives_on_approved_ar_updated' "name",
        count(*) cnt
        FROM "temp_objectives_on_approved_ar_updated";
        */
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
};
