const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        ---------- The steps -------------------------------------------------
        -- 1: Make sure it's the correct ghost goal
        -- 2: Complete any In Progress Objectives on that Goal
        -- 3: actually close the ghost goal
        ----------------------------------------------------------------------

        -- Just here for validation convenience
        DROP TABLE IF EXISTS beforestats;
        CREATE TEMP TABLE beforestats
        AS
        SELECT
          'goals' entity,
          COUNT(*) FILTER (WHERE status = 'Closed') closed,
          COUNT(*) FILTER (WHERE status != 'Closed') open
        FROM "Goals"
        WHERE "deletedAt" IS NULL
        UNION
        SELECT
          'objectives',
          COUNT(*) FILTER (WHERE status = 'Complete'),
          COUNT(*) FILTER (WHERE status != 'Complete')
        FROM "Objectives"
        WHERE "deletedAt" IS NULL
        ORDER BY 1
        ;

        -- 1: Make sure it's the correct ghost goal
        DROP TABLE IF EXISTS goals_to_close;
        CREATE TEMP TABLE goals_to_close
        AS
        SELECT DISTINCT
          g.id gid
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        WHERE g.id = 103372
          AND gr.number = '90CI010132'
        ;

        -- 2: Complete any In Progress Objectives on that Goal
        DROP TABLE IF EXISTS obj_to_complete;
        CREATE TEMP TABLE obj_to_complete
        AS
        SELECT DISTINCT
          o.id oid,
          o."otherEntityId" IS NOT NULL other_entity
        FROM "Objectives" o
        JOIN goals_to_close
          ON o."goalId" = gid
        ;
        
        UPDATE "Objectives" o
        SET
          status = 'Complete',
          "updatedAt" = NOW()
        FROM obj_to_complete
        WHERE id = oid
          AND o.status = 'In Progress'
          AND o."deletedAt" IS NULL
        ;

        -- 3: actually close the ghost goal
        DROP TABLE IF EXISTS inserted_goal_closures;
        CREATE TEMP TABLE inserted_goal_closures
        AS
        WITH updater AS (
        INSERT INTO "GoalStatusChanges" (
          "goalId",
          "oldStatus",
          "newStatus",
          reason
        )
        SELECT
          id,
          status,
          'Closed',
          'Autoclosure in preparation for Standard Goals'
        FROM "Goals"
        JOIN goals_to_close
          ON id = gid
        RETURNING *
        )
        SELECT * FROM updater
        ;

        UPDATE "Goals"
        SET
          status = 'Closed',
          prestandard = TRUE,
          "updatedAt" = NOW()
        FROM goals_to_close
        WHERE id = gid
        ;

        -- Final query for validation convenience
        DROP TABLE IF EXISTS afterstats;
        CREATE TEMP TABLE afterstats
        AS
        SELECT
          'goals' entity,
          COUNT(*) FILTER (WHERE status = 'Closed') closed,
          COUNT(*) FILTER (WHERE status != 'Closed') open,
          (SELECT COUNT(*) FROM goals_to_close) AS close_updates,
          (SELECT COUNT(*) FROM inserted_goal_closures) AS closures_inserted
        FROM "Goals"
        WHERE "deletedAt" IS NULL
        UNION
        SELECT
          'objectives',
          COUNT(*) FILTER (WHERE status = 'Complete'),
          COUNT(*) FILTER (WHERE status != 'Complete'),
          (SELECT COUNT(*) FROM obj_to_complete),
          NULL
        FROM "Objectives"
        WHERE "deletedAt" IS NULL
        ORDER BY 1
        ;

        SELECT
          b.entity,
          b.open orig_open,
          b.closed orig_closed,
          a.close_updates closed,
          a.open new_open,
          a.closed new_closed,
          a.closures_inserted
        FROM beforestats b
        JOIN afterstats a
          ON a.entity=b.entity
        ;
    `,
        { transaction }
      )
    })
  },

  async down() {
    // no rollbacks of data fixes
  },
}
