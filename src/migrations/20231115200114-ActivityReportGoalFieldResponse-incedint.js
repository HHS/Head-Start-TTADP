const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        /* sql */ `
        WITH
          incidents AS (
            SELECT
              dml_txid,
              dml_by,
              dml_type,
              COUNT(*),
              MIN(dml_timestamp),
              MAX(dml_timestamp)
            FROM "ZALActivityReportGoalFieldResponses" zargfr
            GROUP BY 1,2,3
            HAVING COUNT(*) > 400
            ORDER BY 5 DESC
          ),
          responses AS (
            SELECT
              arg."activityReportId",
              g.id "goalId",
              argfr.id "activityReportGoalFieldResponseId",
              argfr.response current_response,
              gfr.response goal_response,
              (
                SELECT ARRAY_AGG(field_responses.response)
                FROM jsonb_array_elements_text(((ARRAY_AGG(zargfr.new_row_data ->> 'response' order by zargfr.id DESC))[1])::JSONB) field_responses(response)
              ) last_valid_response
            FROM "ActivityReportGoalFieldResponses" argfr
            JOIN "ActivityReportGoals" arg
            ON argfr."activityReportGoalId" = arg.id
            JOIN "ActivityReports" a
            ON arg."activityReportId" = a.id
            JOIN "Goals" g
            ON arg."goalId" = g.id
            JOIN "GoalFieldResponses" gfr
            ON g.id = gfr."goalId"
            JOIN "ZALActivityReportGoalFieldResponses" zargfr
            ON argfr.id = zargfr.data_id
            LEFT JOIN incidents i
            ON zargfr.dml_txid = i.dml_txid
            AND zargfr.dml_type = i.dml_type
            where argfr.response != gfr.response
            AND i.count IS NULL
            GROUP BY 1,2,3,4,5
          )
          UPDATE "ActivityReportGoalFieldResponses" argfr
          SET
            response = COALESCE(r.last_valid_response, r.goal_response, ARRAY[]::text[])
          FROM responses r
          WHERE argfr."id" = r."activityReportGoalFieldResponseId"
          AND r.current_response != COALESCE(r.last_valid_response, ARRAY[]::text[]);
     `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
