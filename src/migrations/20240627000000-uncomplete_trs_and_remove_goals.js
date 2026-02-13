const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `

        -- 1. Find the event report IDs for Training Reports that need
        -- all their components set back to in progress and Goals
        -- deleted. If any Goals have already been used (hopefully none)
        -- then exclude that TR from the fix and we'll deal with it
        -- later after the user fixes it.
        DROP TABLE IF EXISTS er_to_update;
        CREATE TEMP TABLE er_to_update
        AS
        WITH er_candidates AS (
        SELECT id erid
        FROM "EventReportPilots"
        WHERE data->>'eventId' in ('R05-TR-23-5019','R05-TR-23-5017')
        ),
        er_goals AS (
        SELECT
          erid,
          BOOL_AND(o.id IS NULL AND arg.id IS NULL) unused
        FROM er_candidates
        JOIN "EventReportPilotGoals" erpg
          ON erid = erpg."eventId"
        LEFT JOIN "Objectives" o
          ON o."goalId" = erpg."goalId"
        LEFT JOIN "ActivityReportGoals" arg
          ON arg."goalId" = erpg."goalId"
        GROUP BY 1
        )
        SELECT DISTINCT erid
        FROM er_goals
        WHERE unused
        ;

        -- 2. Get all the associated Session Reports to update
        DROP TABLE IF EXISTS sr_to_update;
        CREATE TEMP TABLE sr_to_update
        AS
        SELECT id srid
        FROM "SessionReportPilots"
        JOIN er_to_update
          ON "eventId" = erid
        ;

        -- 3. Find all the Goals that need deleting. In step #1
        -- we checked to make sure none of these are connected
        -- to anything else.
        DROP TABLE IF EXISTS goals_to_delete;
        CREATE TEMP TABLE goals_to_delete
        AS
        SELECT DISTINCT erpg."goalId" gid
        FROM "EventReportPilotGoals" erpg
        JOIN er_to_update
          ON erpg."eventId" = erid
        ;
        
        -- 4. Delete the EventReportPilotGoal records
        DROP TABLE IF EXISTS erpg_deletions;
        CREATE TEMP TABLE erpg_deletions
        AS
        WITH updater AS (
        DELETE FROM  "EventReportPilotGoals"
        USING er_to_update
        WHERE "eventId" = erid
        RETURNING
          id erpgid,
          'EventReportPilotGoals deleted' operation
        ) SELECT * FROM updater
        ;

        -- 5. Delete the Goals
        DROP TABLE IF EXISTS goal_deletions;
        CREATE TEMP TABLE goal_deletions
        AS
        WITH updater AS (
        DELETE FROM  "Goals"
        USING goals_to_delete
        WHERE id = gid
        RETURNING
          gid,
          'Goals deleted' operation
        ) SELECT * FROM updater
        ;

        -- 6. Update any "Complete" session statuses back to "In Progress"
        CREATE TEMP TABLE sr_updates
        AS
        WITH updater AS (
        UPDATE "SessionReportPilots"
        SET data = JSONB_SET(data,'{status}','"In progress"')
        FROM sr_to_update
        WHERE id = srid
          AND data->>'status' = 'Complete'
        RETURNING
          srid,
          'SessionReportPilots reset' operation
        ) SELECT * FROM updater
        ;

        -- 6. Update any "Complete" event statuses back to "In Progress"
        CREATE TEMP TABLE er_updates
        AS
        WITH updater AS (
        UPDATE "EventReportPilots"
        SET data = JSONB_SET(data,'{status}','"In progress"')
        FROM er_to_update
        WHERE id = erid
          AND data->>'status' = 'Complete'
        RETURNING
          erid,
          'EventReportPilots reset' operation
        ) SELECT * FROM updater
        ;
      

        -- A quick count of the results that is expected to be:
        --  cnt |           operation
        -- -----+-------------------------------
        --    1 | EventReportPilots reset
        --    8 | SessionReportPilots reset
        --   60 | Goals deleted
        --   60 | EventReportPilotGoals deleted
        SELECT COUNT(*) cnt, operation FROM erpg_deletions GROUP BY 2
        UNION
        SELECT COUNT(*), operation FROM goal_deletions GROUP BY 2
        UNION
        SELECT COUNT(*), operation FROM sr_updates GROUP BY 2
        UNION
        SELECT COUNT(*), operation FROM er_updates GROUP BY 2
        ;
      

        `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      // Reversing this should be a separate migration
    }),
}
