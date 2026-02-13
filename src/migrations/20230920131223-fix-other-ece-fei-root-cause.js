const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
        -- Update Other ECE Care Options root causes for fei.
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
                SET "response" = '{Other ECE Care Options}'
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
                        SET "response" = '{Other ECE Care Options}'
                WHERE "id" IN (SELECT "id" FROM "ids");

            -- Update Workforce, Other ECE Care Options root causes for fei.
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
                    SET "response" = '{Workforce, Other ECE Care Options}'
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
                            SET "response" = '{Workforce, Other ECE Care Options}'
                    WHERE "id" IN (SELECT "id" FROM "ids");
              `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
