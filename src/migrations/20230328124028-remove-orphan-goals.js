/* eslint-disable max-len */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
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

      // Disable allow null and unique.
      await queryInterface.sequelize.query(
        `
        /*
        TTAHUB-1130: Delete Orphan Goals
            This removes any goals created via the Activity Report
            page that are NOT associated with a report.
        */
        -- 1.) Create Orphan GOALS Id's Temp Table.
        SELECT
            g."id" AS "goalId"
            INTO TEMP temp_orphan_goal_ids
        FROM "Goals" g
        WHERE COALESCE(g."createdVia", 'activityReport')  = 'activityReport'
        AND COALESCE(g."isFromSmartsheetTtaPlan", FALSE) = FALSE
        AND g."id" NOT IN
            (SELECT DISTINCT "goalId" FROM "ActivityReportGoals");

        -- 2.) Create Orphan OBJECTIVE Id's Temp Table.
        SELECT
            o."id" AS "objectiveId",
            g."goalId"
            INTO TEMP temp_orphan_objective_ids
        FROM "Objectives" o
        INNER JOIN temp_orphan_goal_ids g
            ON o."goalId" = g."goalId"
        WHERE o."id" NOT IN (SELECT DISTINCT "objectiveId" from "ActivityReportObjectives");

        -- 3.) Clean Objective Orphan Topics.
        DELETE FROM "ObjectiveTopics" WHERE "objectiveId" IN (SELECT "objectiveId" FROM temp_orphan_objective_ids);

        -- 4.) Clean Objective Orphan Resources.
        DELETE FROM "ObjectiveResources" WHERE "objectiveId" IN (SELECT "objectiveId" FROM temp_orphan_objective_ids);

        -- 5.) Clean Objective Orphan Files.
        DELETE FROM "ObjectiveFiles" WHERE "objectiveId" IN (SELECT "objectiveId" FROM temp_orphan_objective_ids);

        -- 6.) Clean Objective Orphan's.
        DELETE FROM "Objectives" WHERE "id" IN (SELECT "objectiveId" FROM temp_orphan_objective_ids);

        -- 7.) Clean Goal Orphan Resources.
        DELETE FROM "GoalResources" WHERE "goalId" IN (SELECT "goalId" FROM temp_orphan_goal_ids);

        -- 8.) Clean Goal Orphan's.
        DELETE FROM "Goals" WHERE "id" IN (SELECT "goalId" FROM temp_orphan_goal_ids);
        `,
        { transaction },
      );
    });
  },
  down: async () => {},
};
