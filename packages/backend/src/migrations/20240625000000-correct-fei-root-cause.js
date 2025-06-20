const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`

      -- Find all the ActivityReportGoalFieldResponses that have the
      -- invalid 'Transportation' value
      DROP TABLE IF EXISTS argfr_to_update;
      CREATE TEMP TABLE argfr_to_update
      AS
      SELECT
        argfr.id argfrid,
        arg."goalId" gid
      FROM "ActivityReportGoalFieldResponses" argfr
      JOIN "ActivityReportGoals" arg
        ON "activityReportGoalId" = arg.id
      WHERE 'Transportation' = ANY(response);

      -- Find all the GoalFieldResponses that have the
      -- invalid 'Transportation' value
      DROP TABLE IF EXISTS gfr_to_update;
      CREATE TEMP TABLE gfr_to_update
      AS
      SELECT
        id gfrid,
        "goalId" gid
      FROM "GoalFieldResponses"
      WHERE 'Transportation' = ANY(response);

      -- Make sure this is only the one recipient being updated.
      -- If 'Transportation' somehow spread somewhere else then
      -- we don't know how to correct it accurately.
      DROP TABLE IF EXISTS recipient_list;
      CREATE TEMP TABLE recipient_list
      AS
      SELECT DISTINCT gr."recipientId"
      FROM argfr_to_update atu
      JOIN "Goals" g
        ON g.id = atu.gid
      JOIN "Grants" gr
        ON g."grantId" = gr.id
      UNION
      SELECT DISTINCT gr."recipientId"
      FROM gfr_to_update atu
      JOIN "Goals" g
        ON g.id = atu.gid
      JOIN "Grants" gr
        ON g."grantId" = gr.id
      ;
      
      -- As a protective step, this will create a divide by zero error and
      -- rollback the transaction if there is more than
      -- one recipient found with 'Transportation' responses
      SELECT 1/
        (
          LEAST(2, (SELECT COUNT(*) FROM recipient_list))
          - 2
        )
      ;

      -- Perform the actual updates to ActivityReportGoalFieldResponses
      CREATE TEMP TABLE argfr_updates
      AS
      WITH updater AS (
      UPDATE "ActivityReportGoalFieldResponses" argfr
      SET response = ARRAY_REPLACE(response,'Transportation','Family Circumstances')
      FROM argfr_to_update u
      WHERE argfrid = argfr.id
      RETURNING
        argfr.id argfrid,
        'ActivityReportGoalFieldResponses' tablename
      ) SELECT * FROM updater
      ;

      -- Perform the actual updates to GoalFieldResponses
      CREATE TEMP TABLE gfr_updates
      AS
      WITH updater AS (
      UPDATE "GoalFieldResponses" gfr
      SET response = ARRAY_REPLACE(response,'Transportation','Family Circumstances')
      FROM gfr_to_update u
      WHERE gfrid = gfr.id
      RETURNING
        gfr.id gfrid,
        'GoalFieldResponses' tablename
      ) SELECT * FROM updater
      ;
     

      -- A quick count of the results that is expected to be:
      -- update_cnt |            tablename
      -- -----------+----------------------------------
      --          3 | GoalFieldResponses
      --         10 | ActivityReportGoalFieldResponses
      SELECT
        COUNT(*) update_cnt,
        tablename
      FROM gfr_updates
      GROUP BY 2
      UNION
      SELECT
        COUNT(*),
        tablename
      FROM argfr_updates
      GROUP BY 2
      ;
      

        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Reversing this should be a separate migration
    },
  ),
};
