const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return queryInterface.sequelize.query(`
        -- This Completes any remaining equity Objectives and Closes any
        -- remaining equity Goals

        -- Create a list of EO-impacted Goals that are not yet closed
        DROP TABLE IF EXISTS equity_goals;
        CREATE TEMP TABLE equity_goals
        AS
        SELECT
          g.id gid,
          LEFT(name, 30) short_gname,
          COALESCE(NULLIF(POSITION(' dei' IN LOWER(name)),0),POSITION(' equit' IN LOWER(name))) gissue_loc,
          status g_status
        FROM "Goals" g
        LEFT JOIN "GoalTemplates" gt
          ON g."goalTemplateId" = gt.id
        WHERE (
            LOWER(name) LIKE '% dei%'
            OR
            LOWER(name) LIKE '% equit%'
            OR
            LOWER(name) LIKE 'dei%'
            OR
            LOWER(name) LIKE 'equit%'
          )
          AND g.status != 'Closed'
          AND g."deletedAt" IS NULL
        ;

        -- Create a list of EO-impacted Objectives that are not yet closed
        -- and are on a non-deleted Goal. 
        DROP TABLE IF EXISTS equity_objectives;
        CREATE TEMP TABLE equity_objectives
        AS
        SELECT
          o.id oid,
          "goalId" ogid,
          title full_otitle,
          LEFT(title, 30) short_otitle,
          COALESCE(NULLIF(POSITION(' dei' IN LOWER(title)),0),POSITION(' equit' IN LOWER(title))) oissue_loc,
          o.status o_status
        FROM "Objectives" o
        JOIN "Goals" g
          ON o."goalId" = g.id
        LEFT JOIN equity_goals
          ON gid = g.id
        WHERE
          (
          gid IS NOT NULL -- Complete objectives on closing Goals
          OR
            ( -- Complete objectives with EO-impacted text
              LOWER(title) LIKE '% dei%'
              OR
              LOWER(title) LIKE '% equit%'
              OR
              LOWER(title) LIKE 'dei%'
              OR
              LOWER(title) LIKE 'equit%'
            )
          )
          AND o.status NOT IN ('Complete','Suspended')
          AND o."deletedAt" IS NULL
          AND g."deletedAt" IS NULL
        ;

        -- Complete the Objectives
        DROP TABLE IF EXISTS updated_obj;
        CREATE TEMP TABLE updated_obj
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        UPDATE "Objectives"
        SET
          "updatedAt" = nowts,
          status = 'Complete'
        FROM equity_objectives
        CROSS JOIN nowtime
        WHERE oid = id
        RETURNING id completed_oid
        )
        SELECT * FROM updater
        ;

        -- Complete the Goals
        DROP TABLE IF EXISTS updated_goals;
        CREATE TEMP TABLE updated_goals
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        UPDATE "Goals"
        SET
          "updatedAt" = nowts,
          status = 'Closed'
        FROM equity_goals
        CROSS JOIN nowtime
        WHERE gid = id
        RETURNING id closed_gid
        )
        SELECT * FROM updater
        ;

        -- Insert the status changes
        DROP TABLE IF EXISTS inserted_goal_changes;
        CREATE TEMP TABLE inserted_goal_changes
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        INSERT INTO "GoalStatusChanges" (
          "goalId",
          "oldStatus",
          "newStatus",
          reason
        )
        SELECT
          gid,
          g_status,
          'Closed',
          'Regional Office request'
        FROM equity_goals
        CROSS JOIN nowtime
        RETURNING *
        )
        SELECT * FROM updater
        ;
        

        -- The first two numbers should match and the last should be 0
        SELECT 1 ord,'equity Objectives' item, COUNT(*) cnt FROM equity_objectives
        UNION
        SELECT 2, 'objectives Completed' , COUNT(*)  FROM updated_obj
        UNION
        SELECT 3 ,'equity Goals' item, COUNT(*) cnt FROM equity_goals
        UNION
        SELECT 4, 'Goals Closed' , COUNT(*)  FROM updated_goals
        UNION
        SELECT 5, 'Goal status changes inserted' , COUNT(*)  FROM inserted_goal_changes
        ORDER BY 1
        ;
      `)
    })
  },

  async down() {
    // no rollbacks
  },
}
