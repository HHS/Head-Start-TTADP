module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
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
          -- 1. Identify all reports with inconsistencies between recipients and connected goals and objectives
          -----------------------------------------------------------------------------------------------------
          CREATE TEMP TABLE "temp_incomplete_reports" AS
          SELECT
            ar."activityReportId",
            array_agg(distinct ar."grantId" order by ar."grantId") "recipientGrantIds",
            array_agg(distinct g."grantId" order by g."grantId") "goalGrantIds",
            array_agg(distinct md5(g.name) order by md5(g.name)) "distinctGoals"
          FROM "ActivityRecipients" ar
          LEFT JOIN "ActivityReportGoals" arg
          ON ar."activityReportId" = arg."activityReportId"
          LEFT JOIN "Goals" g
          ON arg."goalId" = g.id
          WHERE g."grantId" is not null
          GROUP BY ar."activityReportId"
          HAVING array_agg(distinct ar."grantId" order by ar."grantId") != array_agg(distinct g."grantId" order by g."grantId");
          -----------------------------------------------------------------------------------------------------
          -- 2. Identify and create missing goals.
          -----------------------------------------------------------------------------------------------------
          WITH
            "missing_goals" AS (
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
                MIN(g.timeframe) timeframe,
                sum(cast(g."isFromSmartsheetTtaPlan" as int)) > 0  "isFromSmartsheetTtaPlan",
                MIN(g."createdAt") "createdAt",
                MAX(g."updatedAt") "updatedAt",
                ARRAY_AGG(g."closeSuspendReason" ORDER BY g.id) "closeSuspendReason",
                ARRAY_AGG(g."closeSuspendContext" ORDER BY g.id) "closeSuspendContext",
                MIN(g."endDate") "endDate",
                ARRAY_AGG(g."previousStatus") "previousStatus",
                MIN(g."goalTemplateId") "goalTemplateId",
                MIN(g."grantId") "grantId",
                sum(cast(g."onApprovedAR" as int)) > 0 "onApprovedAR",
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
              AND g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") INTERSECT SELECT UNNEST("goalGrantIds")))
              AND md5(g.name) = ANY(ir."distinctGoals")
              GROUP BY
                ir."activityReportId",
                g.name
            )
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
            SELECT
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
              unnest(array(select unnest(ir."recipientGrantIds") except  select unnest(ir."goalGrantIds"))) "grantId",
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
            JOIN "missing_goals" mg
            ON ir."activityReportId" = mg."activityReportId"
            LEFT JOIN "Goals" g
            ON g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") EXCEPT SELECT UNNEST("goalGrantIds")))
            AND md5(g.name) = mg."goalHash"
            WHERE g.id IS NULL;
          -----------------------------------------------------------------------------------------------------
          -- 3. Create missing ActivityReportGoals
          -----------------------------------------------------------------------------------------------------
          INSERT INTO "ActivityReportGoals"
          (
            "activityReportId",
            "goalId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            arg."activityReportId",
            g2.id "goalId",
            g."createdAt",
            g."updatedAt"
          FROM "temp_incomplete_reports" ir
          JOIN "ActivityReportGoals" arg
          ON ir."activityReportId" = arg."activityReportId"
          JOIN "Goals" g
          ON arg."goalId" = g.id
          AND g."grantId" = ("goalGrantIds")[1]
          JOIN "Goals" g2
          ON g2."grantId" = ANY (array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
          AND g."createdAt" = g2."createdAt"
          AND g."updatedAt" = g2."updatedAt"
          AND g."goalTemplateId" = g2."goalTemplateId"
          AND g.name = g2.name;
          -----------------------------------------------------------------------------------------------------
          -- 4. Validate and update onApprovedAR for goals
          -----------------------------------------------------------------------------------------------------
            WITH
              "temp_goals_now_on_approved_ar" AS (
                SELECT
                  g.id,
                  'approved' = any(array_agg(distinct ar."calculatedStatus")) "onApprovedAR"
                FROM "temp_incomplete_reports" ir
                JOIN "ActivityReportGoals" arg
                ON ir."activityReportId" = arg."activityReportId"
                JOIN "Goals" g
                ON arg."goalId" = g.id
                LEFT JOIN "ActivityReportGoals" arg2
                ON g.id = arg2."goalId"
                LEFT JOIN "ActivityReports" ar
                ON arg2."activityReportId" = ar.id
                GROUP BY g.id
                HAVING (array_agg(distinct g."onApprovedAR"))[1] != ('approved' = any(array_agg(distinct ar."calculatedStatus")))
              )
            UPDATE "Goals" g
            SET "onApprovedAR" = t."onApprovedAR"
            FROM "temp_goals_now_on_approved_ar" t
            WHERE g.id = t.id;
            -----------------------------------------------------------------------------------------------------
            -- 5. Identify reports missing objectives with grants.
            -----------------------------------------------------------------------------------------------------
            DROP TABLE "temp_incomplete_reports";
            CREATE TEMP TABLE "temp_incomplete_reports" AS
            SELECT
              ar."activityReportId",
              array_agg(distinct ar."grantId" order by ar."grantId") "recipientGrantIds",
              array_agg(distinct g."grantId" order by g."grantId") "goalGrantIds",
              array_agg(distinct md5(o.title) order by md5(o.title)) "distinctObjectives"
            FROM "ActivityRecipients" ar
            LEFT JOIN "ActivityReportObjectives" aro
            ON ar."activityReportId" = aro."activityReportId"
            LEFT JOIN "Objectives" o
            ON aro."objectiveId" = o.id
            LEFT JOIN "Goals" g
            ON o."goalId" = g.id
            WHERE g."grantId" is not null
            GROUP BY ar."activityReportId"
            HAVING array_agg(distinct ar."grantId" order by ar."grantId") != array_agg(distinct g."grantId" order by g."grantId");

          -----------------------------------------------------------------------------------------------------
          -- 2. Identify and create missing objectives.
          -----------------------------------------------------------------------------------------------------
          WITH
          "missing_objectives" AS (
            SELECT
              ir."activityReportId",
              md5(o.title) "objectiveHash",
              ARRAY_AGG(md5(g.name) ORDER BY o."goalId")  "goalHashs",
              MIN(o.id) "objectiveId",
              MIN(o."goalId") "goalId",
              o.title,
              o.status,
              MIN(o."createdAt") "createdAt",
              MIN(o."updatedAt") "updatedAt",
              MIN(o."objectiveTemplateId") "objectiveTemplateId",
              MIN(o."otherEntityId") "otherEntityId",
              sum(cast(o."onApprovedAR" as int)) > 0 "onApprovedAR",
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
            AND g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") INTERSECT SELECT UNNEST("goalGrantIds")))
            GROUP BY
              ir."activityReportId",
              o.title,
              o.status
          )
          SELECT
            md5(g.name),
            *
          FROM "temp_incomplete_reports" ir
          JOIN "missing_objectives" mo
          ON ir."activityReportId" = mo."activityReportId"
          JOIN "Goals" g
          ON g.id = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") EXCEPT SELECT UNNEST("goalGrantIds")))
          AND md5(g.name) = ANY(mo."goalHashs")
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
