/* eslint-disable max-len */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
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

      // Disable allow null and unique.
      await queryInterface.sequelize.query(
        `
        /*
        TTAHUB-1130: Delete Orphan Goals
            This removes any goals created via the Activity Report
            page that are NOT associated with a report.
        */
        -- 1.) Create Orphan GOALS Id's Temp Table.
        SELECT G."id" AS "goalId"
        INTO TEMP TEMP_ORPHAN_GOAL_IDS
        FROM "Goals" G
        WHERE COALESCE(G."createdVia",
                      'activityReport') = 'activityReport'
          AND COALESCE(G."isFromSmartsheetTtaPlan",
                    FALSE) = FALSE
          AND G."id" NOT IN
            (SELECT DISTINCT "goalId"
              FROM "ActivityReportGoals");

        -- 2.) Create Orphan OBJECTIVE Id's Temp Table.
        SELECT *
        INTO TEMP TEMP_ORPHAN_OBJECTIVE_IDS
        FROM
          (
            -- Orphan Objectives linked to orphan Goals.
            SELECT O."id" AS "objectiveId"
            FROM "Objectives" O
            INNER JOIN TEMP_ORPHAN_GOAL_IDS G ON O."goalId" = G."goalId"
            WHERE O."id" NOT IN
                (SELECT DISTINCT "objectiveId"
                  FROM "ActivityReportObjectives")
            UNION -- Orphan Objectives not linked to Goals.
          SELECT O."id" AS "objectiveId"
            FROM "Objectives" O
            LEFT JOIN "ActivityReportObjectives" ARO ON O.ID = ARO."objectiveId"
            WHERE ARO.ID IS NULL
              AND COALESCE(O."createdVia", 'activityReport') = 'activityReport' ) AS TMP;

        -- 3.) Clean Objective Orphan Topics.
        DROP TABLE IF EXISTS temp_results_count;
        WITH deletedObjectiveTopics AS (
        DELETE
        FROM "ObjectiveTopics"
        WHERE "objectiveId" IN
            (SELECT "objectiveId"
              FROM TEMP_ORPHAN_OBJECTIVE_IDS)
        RETURNING *)
        SELECT 'Objective Topics', count(*)
        INTO TEMP temp_results_count
        FROM deletedObjectiveTopics;

        -- 4.) Clean Objective Orphan Resources.
        WITH objectiveResources AS (
          DELETE
          FROM "ObjectiveResources"
          WHERE "objectiveId" IN
              (SELECT "objectiveId"
                FROM TEMP_ORPHAN_OBJECTIVE_IDS)
        RETURNING *)
        INSERT INTO temp_results_count
        SELECT 'Objective Resources', count(*)
        FROM objectiveResources;

        -- 5.) Clean Objective Orphan Files.
        -- 5a.) Create Temp Table of Files being used by reports or non-orphan Objectives.
        SELECT *
        INTO TEMP TEMP_USED_OBJECTIVE_FILES_IDS
        FROM
          (
            SELECT o."fileId"
            FROM "ObjectiveFiles" o
            WHERE o."objectiveId" NOT IN
                (SELECT "objectiveId"
                  FROM TEMP_ORPHAN_OBJECTIVE_IDS)
            UNION
            SELECT DISTINCT AROF."fileId"
            FROM "ActivityReportObjectiveFiles" AROF
            UNION
            SELECT DISTINCT ARF."fileId"
            FROM "ActivityReportFiles" ARF) AS TMP;

      -- 5b.) Clean Objective Files.
      WITH objectiveFiless AS (
          DELETE
          FROM "ObjectiveFiles"
          WHERE "objectiveId" IN
              (SELECT "objectiveId"
                FROM TEMP_ORPHAN_OBJECTIVE_IDS)
      RETURNING *)
      INSERT INTO temp_results_count
      SELECT 'Objective Files', count(*)
      FROM objectiveFiless;

      -- 5c.) Clean files only used by Orphan Objectives.
      WITH files AS (
          DELETE
          FROM "Files"
          WHERE "id" NOT IN
              (SELECT "fileId"
                FROM TEMP_USED_OBJECTIVE_FILES_IDS)
      RETURNING *)
      INSERT INTO temp_results_count
      SELECT 'Files', count(*)
      FROM files;

      -- 6.) Clean Objective Orphan's.
      WITH objectives AS (
          DELETE
          FROM "Objectives"
          WHERE "id" IN
              (SELECT "objectiveId"
                FROM TEMP_ORPHAN_OBJECTIVE_IDS)
      RETURNING *)
      INSERT INTO temp_results_count
      SELECT 'Objectives', count(*)
      FROM objectives;

      -- 7.) Clean Goal Orphan Resources.
      -- 7a.) Create Temp Table of Resources being used by reports or non-orphan Objectives.
          SELECT *
      INTO TEMP TEMP_USED_OBJECTIVE_RESOURCE_IDS
          FROM
            (
              SELECT O."resourceId"
              FROM "ObjectiveResources" O
              WHERE O."objectiveId" NOT IN
                  (SELECT "objectiveId"
                    FROM TEMP_ORPHAN_OBJECTIVE_IDS)
              UNION
              SELECT DISTINCT ARR."resourceId"
              FROM "ActivityReportResources" ARR
              UNION
              SELECT DISTINCT NSR."resourceId"
              FROM "NextStepResources" NSR
              UNION
              SELECT DISTINCT OTR."resourceId"
              FROM "ObjectiveTemplateResources" OTR
              UNION
              SELECT DISTINCT AROR."resourceId"
              FROM "ActivityReportObjectiveResources" AROR) AS TMP;

      -- 7b.) Clean Objective Resources.
      WITH goalResources AS (
          DELETE
          FROM "GoalResources"
          WHERE "goalId" IN
              (SELECT "goalId"
                FROM TEMP_ORPHAN_GOAL_IDS)
      RETURNING *)
      INSERT INTO temp_results_count
      SELECT 'Goal Resources', count(*)
      FROM goalResources;

      -- 7c.) Clean resources only used by Orphan Objectives.
      WITH resources AS (
          DELETE
          FROM "Resources"
          WHERE "id" NOT IN
              (SELECT "resourceId"
                FROM TEMP_USED_OBJECTIVE_RESOURCE_IDS)
      RETURNING *)
      INSERT INTO temp_results_count
      SELECT 'Resources', count(*)
      FROM resources;

      -- 8.) Clean Goal Orphan's.
      WITH goals AS (
            DELETE
            FROM "Goals"
            WHERE "id" IN
                (SELECT "goalId"
                  FROM TEMP_ORPHAN_GOAL_IDS)
        RETURNING *)
        INSERT INTO temp_results_count
        SELECT 'Goals', count(*)
        FROM goals;

        -- 9.) DROP temp tables.
        DROP TABLE TEMP_ORPHAN_GOAL_IDS;
        DROP TABLE TEMP_ORPHAN_OBJECTIVE_IDS;
        DROP TABLE TEMP_USED_OBJECTIVE_FILES_IDS;
        DROP TABLE TEMP_USED_OBJECTIVE_RESOURCE_IDS;

        -- 10.) Select Results.
        SELECT * FROM temp_results_count;
        `,
        { transaction }
      )
    })
  },
  down: async () => {},
}
