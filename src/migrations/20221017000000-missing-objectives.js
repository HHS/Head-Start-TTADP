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
          -- 1. Create ActivityReportGoals for each of the goals linked via ActivityReportObjectives
          -----------------------------------------------------------------------------------------------------
    WITH
      "GaolsThroughObjecitves" AS (
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
        FROM "GaolsThroughObjecitves"
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
          -- 1. Identify all reports with inconsistencies between recipients and connected goals and objectives
          -----------------------------------------------------------------------------------------------------
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
          LEFT JOIN "ActivityReportGoals" arg
          ON ar."activityReportId" = arg."activityReportId"
          LEFT JOIN "Goals" g
          ON arg."goalId" = g.id
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
        LEFT JOIN "ActivityReportObjectives" aro
        ON ar."activityReportId" = aro."activityReportId"
        LEFT JOIN "Objectives" o
        ON aro."objectiveId" = o.id
        LEFT JOIN "Goals" g
        ON o."goalId" = g.id
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
      SELECT *
      FROM "through_both";
          -----------------------------------------------------------------------------------------------------
          -- 2. Identify goals.
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
        AND g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") INTERSECT SELECT UNNEST("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        GROUP BY
          ir."activityReportId",
          g.name
      ),
      "missing_goals_added" AS (
          -----------------------------------------------------------------------------------------------------
          -- 4. Create missing goals for the grants identified
          -----------------------------------------------------------------------------------------------------
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
        AND mg."goalHash" = ANY(ir."distinctGoals")
        LEFT JOIN "Goals" g
        ON g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") EXCEPT SELECT UNNEST("goalGrantIds")))
        AND md5(g.name) = mg."goalHash"
        WHERE g.id IS NULL
        RETURNING
          id "goalId"
      ),
      "missing_args_added" AS (
          -----------------------------------------------------------------------------------------------------
          -- 4. Create new ActivityReportGoals for added goals
          -----------------------------------------------------------------------------------------------------
        INSERT INTO "ActivityReportGoals"
        (
          "activityReportId",
          "goalId",
          "createdAt",
          "updatedAt"
        )
        SELECT
          ir."activityReportId",
          g.id "goalId",
          MIN(arg2."createdAt") "createdAt",
          MAX(arg2."updatedAt") "updatedAt"
        FROM "missing_goals_added" mga
        JOIN "Goals" g
        ON mga."goalId" = g.id
        JOIN "temp_incomplete_reports" ir
        ON g."grantId" = ANY(array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        LEFT JOIN "ActivityReportGoals" arg
        ON ir."activityReportId" = arg."activityReportId"
        AND g.id = arg."goalId"
        LEFT JOIN "ActivityReportGoals" arg2
        ON ir."activityReportId" = arg2."activityReportId"
        LEFT JOIN "Goals" g2
        ON arg2."goalId" = g2.id
        AND g."grantId" = ANY(ir."goalGrantIds")
        AND md5(g.name) = md5(g2.name)
        WHERE arg.id IS NULL
        GROUP BY
          ir."activityReportId",
          g.id
          -----------------------------------------------------------------------------------------------------
      ),
      "goals_now_on_approved_ar" AS (
        SELECT
          mga."goalId",
          'approved' = any(array_agg(distinct ar."calculatedStatus")) "onApprovedAR"
        FROM "missing_goals_added" mga
        JOIN "Goals" g
        ON mga."goalId" = g.id
        JOIN "ActivityReportGoals" arg
        ON mga."goalId" = arg."goalId"
        LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        GROUP BY mga."goalId"
        HAVING bool_or(g."onApprovedAR") != ('approved' = any(array_agg(distinct ar."calculatedStatus")))
      )
          -----------------------------------------------------------------------------------------------------
          -- 4. Validate and update onApprovedAR for goals
          -----------------------------------------------------------------------------------------------------
      UPDATE "Goals" g
            SET "onApprovedAR" = t."onApprovedAR"
            FROM "goals_now_on_approved_ar" t
            WHERE g.id = t."goalId";
          -----------------------------------------------------------------------------------------------------
    WITH
      "missing_objectives" AS (
        SELECT
          ir."activityReportId",
          md5(o.title) "objectiveHash",
          ARRAY_AGG(md5(g.name) ORDER BY o."goalId")  "goalHashs",
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
        AND g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") INTERSECT SELECT UNNEST("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        GROUP BY
          ir."activityReportId",
          o.title,
          o.status
      ),
      "missing_objectives_added" AS (
          -----------------------------------------------------------------------------------------------------
          -- 4. Create missing objectives for the grants+goals identified
          -----------------------------------------------------------------------------------------------------
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
      JOIN "missing_objectives" mo
      ON ir."activityReportId" = mo."activityReportId"
      JOIN "Goals" g
      ON g."grantId" = ANY (ARRAY(SELECT UNNEST("recipientGrantIds") EXCEPT SELECT UNNEST("goalGrantIds")))
      AND md5(g.name) = ANY(mo."goalHashs")
      LEFT JOIN "Objectives" o
      ON g.id = o."goalId"
      and md5(o.title) = mo."objectiveHash"
      WHERE o.id IS NULL
      RETURNING
        id "objectiveId"
          -----------------------------------------------------------------------------------------------------
      ),
      "missing_objective_files" AS (
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
        FROM "missing_objectives_added" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "Goals" g
        ON o."goalId" = g.id
        JOIN "temp_incomplete_reports" ir
        ON g."grantId" = ANY(array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        AND md5(o.title) = ANY(ir."distinctObjectives")
        LEFT JOIN "ObjectiveFiles" f
        ON o.id = f."objectiveId"
        LEFT JOIN "Goals" g2
        ON g2."grantId" = ANY(ir."goalGrantIds")
        AND md5(g.name) = md5(g2.name)
        LEFT JOIN "Objectives" o2
        ON g2.id = o2."goalId"
        AND md5(o.title) = md5(o2.title)
        LEFT JOIN "ObjectiveFiles" f2
        ON o2.id = f2."objectiveId"
        WHERE f.id IS NULL
        GROUP BY
          o.id,
          f2."fileId"
      ),
      "missing_objective_Resources" AS (
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
        FROM "missing_objectives_added" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "Goals" g
        ON o."goalId" = g.id
        JOIN "temp_incomplete_reports" ir
        ON g."grantId" = ANY(array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        AND md5(o.title) = ANY(ir."distinctObjectives")
        LEFT JOIN "ObjectiveResources" r
        ON o.id = r."objectiveId"
        LEFT JOIN "Goals" g2
        ON g2."grantId" = ANY(ir."goalGrantIds")
        AND md5(g.name) = md5(g2.name)
        LEFT JOIN "Objectives" o2
        ON g2.id = o2."goalId"
        AND md5(o.title) = md5(o2.title)
        LEFT JOIN "ObjectiveResources" r2
        ON o2.id = r2."objectiveId"
        WHERE r.id IS NULL
        GROUP BY
          o.id,
          r2."userProvidedUrl"
      ),
      "missing_objective_Roles" AS (
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
        FROM "missing_objectives_added" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "Goals" g
        ON o."goalId" = g.id
        JOIN "temp_incomplete_reports" ir
        ON g."grantId" = ANY(array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        AND md5(o.title) = ANY(ir."distinctObjectives")
        LEFT JOIN "ObjectiveRoles" r
        ON o.id = r."objectiveId"
        LEFT JOIN "Goals" g2
        ON g2."grantId" = ANY(ir."goalGrantIds")
        AND md5(g.name) = md5(g2.name)
        LEFT JOIN "Objectives" o2
        ON g2.id = o2."goalId"
        AND md5(o.title) = md5(o2.title)
        LEFT JOIN "ObjectiveRoles" r2
        ON o2.id = r2."objectiveId"
        WHERE r.id IS NULL
        GROUP BY
          o.id,
          r2."roleId"
      ),
      "missing_objective_Topics" AS (
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
        FROM "missing_objectives_added" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "Goals" g
        ON o."goalId" = g.id
        JOIN "temp_incomplete_reports" ir
        ON g."grantId" = ANY(array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        AND md5(o.title) = ANY(ir."distinctObjectives")
        LEFT JOIN "ObjectiveTopics" t
        ON o.id = t."objectiveId"
        LEFT JOIN "Goals" g2
        ON g2."grantId" = ANY(ir."goalGrantIds")
        AND md5(g.name) = md5(g2.name)
        LEFT JOIN "Objectives" o2
        ON g2.id = o2."goalId"
        AND md5(o.title) = md5(o2.title)
        LEFT JOIN "ObjectiveTopics" t2
        ON o2.id = t2."objectiveId"
        WHERE t.id IS NULL
        GROUP BY
          o.id,
          t2."topicId"
      ),
      "missing_aros_added" AS (
          -----------------------------------------------------------------------------------------------------
          -- 4. Create new ActivityReportGoals for added goals
          -----------------------------------------------------------------------------------------------------
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
        FROM "missing_objectives_added" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "Goals" g
        ON o."goalId" = g.id
        JOIN "temp_incomplete_reports" ir
        ON g."grantId" = ANY(array(select unnest("recipientGrantIds") except  select unnest("goalGrantIds")))
        AND md5(g.name) = ANY(ir."distinctGoals")
        AND md5(o.title) = ANY(ir."distinctObjectives")
        LEFT JOIN "ActivityReportObjectives" aro
        ON ir."activityReportId" = aro."activityReportId"
        AND o.id = aro."objectiveId"
        LEFT JOIN "ActivityReportObjectives" aro2
        ON ir."activityReportId" = aro2."activityReportId"
        LEFT JOIN "Objectives" o2
        ON aro2."objectiveId" = o2.id
        AND md5(o.title) = md5(o2.title)
        LEFT JOIN "Goals" g2
        ON o2."goalId" = g2.id
        AND g2."grantId" = ANY(ir."goalGrantIds")
        AND md5(g.name) = md5(g2.name)
        WHERE aro.id IS NULL
        GROUP BY
          ir."activityReportId",
          o.id
          -----------------------------------------------------------------------------------------------------
      ),
      "objectives_now_on_approved_ar" AS (
        SELECT
          moa."objectiveId",
          'approved' = any(array_agg(distinct ar."calculatedStatus")) "onApprovedAR"
        FROM "missing_objectives_added" moa
        JOIN "Objectives" o
        ON moa."objectiveId" = o.id
        JOIN "ActivityReportObjectives" aro
        ON moa."objectiveId" = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        GROUP BY moa."objectiveId"
        HAVING bool_or(o."onApprovedAR") != ('approved' = any(array_agg(distinct ar."calculatedStatus")))
      )
          -----------------------------------------------------------------------------------------------------
          -- 4. Validate and update onApprovedAR for objectives
          -----------------------------------------------------------------------------------------------------
      UPDATE "Objectives" o
            SET "onApprovedAR" = t."onApprovedAR"
            FROM "objectives_now_on_approved_ar" t
            WHERE o.id = t."objectiveId";
          -----------------------------------------------------------------------------------------------------


    /*
      Grant -> ActivityRecipient <-> ActivityReport <-> ActivityReportGrant -> Goal -> Grant
                                                    <-> ActivityReportObjective -> Objective -> Goal -> Grant


      OtherEntity -> ActivityRecipient <-> ActivityReport <-> ActivityReportObjective -> Objective -> OtherEntity

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
