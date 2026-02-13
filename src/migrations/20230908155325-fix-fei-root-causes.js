const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
        -- Update workforce root causes for fei.
        with ids as (
            SELECT
            argfr.id
            FROM "Grants" gr
            JOIN "Goals" goal
                ON gr.id = goal."grantId"
            JOIN "ActivityReportGoals" arg
                ON goal."id" = arg."goalId"
            JOIN "ActivityReportGoalFieldResponses" argfr
                ON arg.id = argfr."activityReportGoalId"
            WHERE "number" IN ('06CH011554', '06CH011558', '06CH010965', '06CH010720', '06HP000120', '06HP000296', '06CH011143'))
            UPDATE "ActivityReportGoalFieldResponses"
                SET "response" = '{Workforce}'
            WHERE "id" IN (SELECT "id" FROM "ids");

            with ids as (
                SELECT
                gfr.id
                FROM "Grants" gr
                JOIN "Goals" goal
                    ON gr.id = goal."grantId"
                JOIN "GoalFieldResponses" gfr
                    ON goal.id = gfr."goalId"
                WHERE "number" IN ('06CH011554', '06CH011558', '06CH010965', '06CH010720', '06HP000120', '06HP000296', '06CH011143'))
                UPDATE "GoalFieldResponses"
                    SET "response" = '{Workforce}'
                WHERE "id" IN (SELECT "id" FROM "ids");

            -- Update workforce, transportation root causes for fei.
            with ids as (
                SELECT
                argfr.id
                FROM "Grants" gr
                JOIN "Goals" goal
                    ON gr.id = goal."grantId"
                JOIN "ActivityReportGoals" arg
                    ON goal."id" = arg."goalId"
                JOIN "ActivityReportGoalFieldResponses" argfr
                    ON arg.id = argfr."activityReportGoalId"
                WHERE "number" IN ('06CH011469', '06CH011503', '06CH011919'))
                UPDATE "ActivityReportGoalFieldResponses"
                    SET "response" = '{Workforce, Transportation}'
                WHERE "id" IN (SELECT "id" FROM "ids");

                with ids as (
                    SELECT
                    gfr.id
                    FROM "Grants" gr
                    JOIN "Goals" goal
                        ON gr.id = goal."grantId"
                    JOIN "GoalFieldResponses" gfr
                        ON goal.id = gfr."goalId"
                         WHERE "number" IN ('06CH011469', '06CH011503', '06CH011919'))
                    UPDATE "GoalFieldResponses"
                        SET "response" = '{Workforce, Transportation}'
                    WHERE "id" IN (SELECT "id" FROM "ids");

                -- Update workforce, facilities root causes for fei.
                with ids as (
                    SELECT
                    argfr.id
                    FROM "Grants" gr
                    JOIN "Goals" goal
                        ON gr.id = goal."grantId"
                    JOIN "ActivityReportGoals" arg
                        ON goal."id" = arg."goalId"
                    JOIN "ActivityReportGoalFieldResponses" argfr
                        ON arg.id = argfr."activityReportGoalId"
                    WHERE "number" IN ('06CH010885', '06CH010663', '06HP000249', '06CH011990', '06HP000184', '06CH011272'))
                    UPDATE "ActivityReportGoalFieldResponses"
                        SET "response" = '{Workforce, Facilities}'
                    WHERE "id" IN (SELECT "id" FROM "ids");

                    with ids as (
                        SELECT
                        gfr.id
                        FROM "Grants" gr
                        JOIN "Goals" goal
                            ON gr.id = goal."grantId"
                        JOIN "GoalFieldResponses" gfr
                            ON goal.id = gfr."goalId"
                            WHERE "number" IN ('06CH010885', '06CH010663', '06HP000249', '06CH011990', '06HP000184', '06CH011272'))
                        UPDATE "GoalFieldResponses"
                                SET "response" = '{Workforce, Facilities}'
                        WHERE "id" IN (SELECT "id" FROM "ids");

                    -- Update Other ECE Options root causes for fei.
                    with ids as (
                        SELECT
                        argfr.id
                        FROM "Grants" gr
                        JOIN "Goals" goal
                            ON gr.id = goal."grantId"
                        JOIN "ActivityReportGoals" arg
                            ON goal."id" = arg."goalId"
                        JOIN "ActivityReportGoalFieldResponses" argfr
                            ON arg.id = argfr."activityReportGoalId"
                        WHERE "number" IN ('06CH010745', '06HP000265', '06HP000473'))
                        UPDATE "ActivityReportGoalFieldResponses"
                            SET "response" = '{Other ECE Options}'
                        WHERE "id" IN (SELECT "id" FROM "ids");

                        with ids as (
                            SELECT
                            gfr.id
                            FROM "Grants" gr
                            JOIN "Goals" goal
                                ON gr.id = goal."grantId"
                            JOIN "GoalFieldResponses" gfr
                                ON goal.id = gfr."goalId"
                                WHERE "number" IN ('06CH010745', '06HP000265', '06HP000473'))
                            UPDATE "GoalFieldResponses"
                                    SET "response" = '{Other ECE Options}'
                            WHERE "id" IN (SELECT "id" FROM "ids");

                        -- Update Workforce, Other ECE Options root causes for fei.
                        with ids as (
                            SELECT
                            argfr.id
                            FROM "Grants" gr
                            JOIN "Goals" goal
                                ON gr.id = goal."grantId"
                            JOIN "ActivityReportGoals" arg
                                ON goal."id" = arg."goalId"
                            JOIN "ActivityReportGoalFieldResponses" argfr
                                ON arg.id = argfr."activityReportGoalId"
                            WHERE "number" IN ('06CH011414'))
                            UPDATE "ActivityReportGoalFieldResponses"
                                SET "response" = '{Workforce, Other ECE Options}'
                            WHERE "id" IN (SELECT "id" FROM "ids");

                            with ids as (
                                SELECT
                                gfr.id
                                FROM "Grants" gr
                                JOIN "Goals" goal
                                    ON gr.id = goal."grantId"
                                JOIN "GoalFieldResponses" gfr
                                    ON goal.id = gfr."goalId"
                                    WHERE "number" IN ('06CH011414'))
                                UPDATE "GoalFieldResponses"
                                        SET "response" = '{Workforce, Other ECE Options}'
                                WHERE "id" IN (SELECT "id" FROM "ids");
            `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
