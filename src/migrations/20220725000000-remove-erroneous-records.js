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

      // Disable logging while doing mass updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "erroneousAROs" AS
            SELECT
              aro.id "aroId",
              aro."objectiveId"
            FROM  "ActivityReportObjectives" aro
            JOIN "Objectives" o
            ON aro."objectiveId" = o.id
            JOIN "Goals" g
            ON o."goalId" = g.id
            LEFT JOIN "ActivityRecipients" r
            ON aro."activityReportId" = r."activityReportId"
            AND g."grantId" = r."grantId"
            WHERE r.id IS NULL;
            ------------------------------------------------------------------------------------
            CREATE TEMP TABLE "erroneousARGs" AS
            SELECT
              arg.id "argId",
              arg."goalId"
            FROM  "ActivityReportGoals" arg
            JOIN "Goals" g
            ON arg."goalId" = g.id
            LEFT JOIN "ActivityRecipients" r
            ON arg."activityReportId" = r."activityReportId"
            AND g."grantId" = r."grantId"
            WHERE r.id is null;
            ------------------------------------------------------------------------------------
            CREATE TEMP TABLE "erroneousObjectives" AS
            WITH
            "erroneousAROsByObjective" AS (
              Select
                "objectiveId",
                ARRAY_AGG("aroId" ORDER BY "aroId") aros
              FROM "erroneousAROs" earo
              GROUP BY "objectiveId"
            ),
            "AROsByObjective" as (
              Select
                o.id "objectiveId",
                ARRAY_AGG(aro.id ORDER BY aro.id) aros
              FROM "Objectives" o
              JOIN "ActivityReportObjectives" aro
              ON o.id = aro."objectiveId"
              GROUP BY o.id
            )
            SELECT
              earoo."objectiveId",
              o."goalId"
            FROM "erroneousAROsByObjective" earoo
            JOIN "AROsByObjective" aroo
            ON earoo."objectiveId" = aroo."objectiveId"
            AND earoo."aros" = aroo."aros"
            JOIN "Objectives" o
            ON earoo."objectiveId" = o.id;
            ------------------------------------------------------------------------------------
            CREATE TEMP TABLE "erroneousGoals" AS
            WITH
            "erroneousObjectivesByGoal" AS (
              SELECT
                eo."goalId",
                ARRAY_AGG(eo."objectiveId" ORDER BY eo."objectiveId") objectives
              FROM "erroneousObjectives" eo
              GROUP BY eo."goalId"
            ),
            "objectivesByGoal" AS (
              SELECT
                g.id "goalId",
                ARRAY_AGG(o."id" ORDER BY o."id") objectives
              FROM "Goals" g
              JOIN "Objectives" o
              ON g.id = o."goalId"
              WHERE "isFromSmartsheetTtaPlan" = false
              GROUP BY g.id
            )
            SELECT
              eog."goalId"
            FROM "erroneousObjectivesByGoal" eog
            JOIN "objectivesByGoal" og
            ON eog."goalId" = og."goalId"
            AND eog.objectives = og.objectives;
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 34754
            DELETE FROM "ActivityReportObjectives" aro
            USING "erroneousAROs" earo
            WHERE aro.id = earo."aroId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 28357
            DELETE FROM "ActivityReportGoals" arg
            USING "erroneousARGs" earg
            WHERE arg.id = earg."argId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 0
            DELETE FROM "ObjectiveFiles" "of"
            USING "erroneousObjectives" eo
            WHERE "of"."objectiveId" = eo."objectiveId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 0
            DELETE FROM "ObjectiveResources" "or"
            USING "erroneousObjectives" eo
            WHERE "or"."objectiveId" = eo."objectiveId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 0
            DELETE FROM "ObjectiveRoles" "or"
            USING "erroneousObjectives" eo
            WHERE "or"."objectiveId" = eo."objectiveId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 3951
            DELETE FROM "ObjectiveTopics" ot
            USING "erroneousObjectives" eo
            WHERE ot."objectiveId" = eo."objectiveId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 29591
            DELETE FROM "Objectives" o
            USING "erroneousObjectives" eo
            WHERE o.id = eo."objectiveId";
            ------------------------------------------------------------------------------------
            -- EXPECTED TO DELETE 4
            DELETE FROM "Goals" g
            USING "erroneousGoals" eg
            WHERE g.id = eg."goalId";
            ------------------------------------------------------------------------------------
            DROP TABLE
              "erroneousAROs",
              "erroneousARGs",
              "erroneousObjectives",
              "erroneousGoals";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Enable logging after mass updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
