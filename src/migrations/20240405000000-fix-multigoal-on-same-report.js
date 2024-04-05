const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        DO $$
        DECLARE
          affected_count bigint;
          updated_count bigint;
          deleted_count bigint;
        BEGIN
        -- 1. Collect the data set that needs to be corrected
         DROP TABLE IF EXISTS tmp_affected_args;
         CREATE TEMP TABLE tmp_affected_args
         AS
         SELECT 
          "activityReportId",
          "goalId",
          (ARRAY_AGG(arg.id ORDER BY arg.id))[1] primary_arg,
          (ARRAY_AGG(arg.id ORDER BY arg.id))[2] extra_arg,
          CASE
            WHEN array_length(ARRAY_AGG(DISTINCT arg.status),1) = 1
              THEN (ARRAY_AGG(DISTINCT arg.status))[1]
            ELSE (ARRAY_AGG(arg.status ORDER BY arg."createdAt"))[1]
          END status,
          (ARRAY_AGG(DISTINCT arg.source))[1] source
        FROM "ActivityReportGoals" arg
        GROUP BY 1,2
        HAVING COUNT(*) > 1
        ORDER BY 1,2;

        SELECT
          COUNT(*)
        INTO affected_count
        FROM tmp_affected_args;
        RAISE NOTICE 'Number or affected "ActivityReportGoal" records: %', affected_count;

        -- 2. update the records that need to be corrected
        DROP TABLE IF EXISTS tmp_updated_args;
        CREATE TEMP TABLE tmp_updated_args
        AS
        WITH updated_args AS (
          UPDATE "ActivityReportGoals" arg
          SET
            status = taa.status,
            source = taa.source
          FROM tmp_affected_args taa
          WHERE arg.id = taa.primary_arg
          RETURNING
            arg.id,
            arg."activityReportId",
            arg."goalId",
            arg.status,
            arg.source
        )
        SELECT
          id,
          "activityReportId",
          "goalId",
          status,
          source
        FROM updated_args;

        SELECT
          COUNT(*)
        INTO updated_count
        FROM tmp_updated_args;
        RAISE NOTICE 'Number or updated "ActivityReportGoal" records: %', updated_count;

        -- 3. delete the extra records that are causing the issues
        DROP TABLE IF EXISTS tmp_deleted_args;
        CREATE TEMP TABLE tmp_deleted_args
        AS
        WITH deleted_args AS (
          DELETE FROM "ActivityReportGoals" arg
          USING tmp_affected_args taa
          WHERE arg.id = taa.extra_arg
          RETURNING
            arg.id,
            arg."activityReportId",
            arg."goalId",
            arg.status,
            arg.source
        )
        SELECT
          id,
          "activityReportId",
          "goalId",
          status,
          source
        FROM deleted_args;

        SELECT
          COUNT(*)
        INTO deleted_count
        FROM tmp_deleted_args;
        RAISE NOTICE 'Number or updated "ActivityReportGoal" records: %', deleted_count;

        -- 4. cleanup
        DROP TABLE IF EXISTS tmp_affected_args;
        DROP TABLE IF EXISTS tmp_updated_args;
        DROP TABLE IF EXISTS tmp_deleted_args;

        END $$;
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
