const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        -- If objectives are neither suspended nor complete and are on closed
        -- Goals, this marks them 'Suspended'. It also soft-deletes Goals
        -- with disallowed text that are not on any non-deleted AR.

        -- Create a table listing all Goals with text that was disallowed due
        -- to the EO.
        DROP TABLE IF EXISTS disallowed_goals;
        CREATE TEMP TABLE disallowed_goals
        AS
        SELECT
          id gid,
          name gname,
          status gstatus
        FROM "Goals"
        WHERE (
            LOWER(name) LIKE '% dei%'
            OR
            LOWER(name) LIKE '% equit%'
            OR
            LOWER(name) LIKE 'dei%'
            OR
            LOWER(name) LIKE 'equit%'
          )
          AND "deletedAt" IS NULL
        ;

        -- Get a list of all the active Objectives on Goals with a status of
        -- 'Closed'. Keeping this order after generelizing the logic to make
        -- a less confusing diff from the previous version that only applied
        -- to disallowed goals.
        DROP TABLE IF EXISTS objectives_to_suspend;
        CREATE TEMP TABLE objectives_to_suspend
        AS
        SELECT
          o.id oid,
          -- Other columns here for convenience when inspecting
          o.status orig_ostatus,
          o."createdAt" obj_createtime,
          LEFT(o.title, 30) short_otitle,
          LEFT(g.name, 50) short_gname
        FROM "Objectives" o
        JOIN "Goals" g
          ON o."goalId" = g.id
        WHERE g.status = 'Closed'
          AND o.status NOT IN ('Complete', 'Suspended')
          AND g."deletedAt" IS NULL
          AND o."deletedAt" IS NULL
        ;

        -- Update the Objectives
        DROP TABLE IF EXISTS updated_obj;
        CREATE TEMP TABLE updated_obj
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        UPDATE "Objectives"
        SET
          "updatedAt" = nowts,
          status = 'Suspended'
        FROM objectives_to_suspend
        CROSS JOIN nowtime
        WHERE oid = id
        RETURNING id completed_oid
        )
        SELECT * FROM updater
        ;

        -- Get a list of all the disallowed Goals without any connections
        -- to non-deleted ARs. We will soft-delete these.
        DROP TABLE IF EXISTS goals_to_delete;
        CREATE TEMP TABLE goals_to_delete
        AS
        WITH linked_goals AS (
        SELECT
          gid,
          aro.id aroid,
          "calculatedStatus" ar_status,
          gname
        FROM disallowed_goals
        LEFT JOIN "ActivityReportGoals" aro
          ON "goalId" = gid
        LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
        ),
        -- This is here in case the goals are connected to both deleted and
        -- non-deleted ARs
        marked_goals AS (
        SELECT
          gid marked_gid,
          BOOL_AND(aroid IS NULL) unlinked,
          BOOL_AND(ar_status = 'deleted') all_deleted
        FROM linked_goals
        GROUP BY 1
        )
        SELECT
          gid,
          -- Other columns here for convenience when inspecting
          aroid,
          ar_status,
          LEFT(gname, 50) short_gname
        FROM linked_goals
        JOIN marked_goals
          ON gid = marked_gid
        WHERE unlinked
          OR all_deleted
        ;

        DROP TABLE IF EXISTS updated_goals;
        CREATE TEMP TABLE updated_goals
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        UPDATE "Goals"
        SET
          "updatedAt" = nowts,
          "deletedAt" = nowts
        FROM goals_to_delete
        CROSS JOIN nowtime
        WHERE gid = id
        RETURNING id deleted_gid
        )
        SELECT * FROM updater
        ;

        -- disallowed_goals is just for context but the other numbers should match up
        SELECT 1 ord,'disallowed_goals' item, COUNT(*) cnt FROM disallowed_goals
        UNION
        SELECT 2, 'objectives_to_suspend' , COUNT(*)  FROM objectives_to_suspend
        UNION
        SELECT 3, 'updated_obj', COUNT(*)  FROM updated_obj
        UNION
        SELECT 4, 'mismatched suspensions', COUNT(*) FROM (
          (
            SELECT oid FROM objectives_to_suspend
            EXCEPT
            SELECT completed_oid FROM updated_obj
          )
          UNION
          (
            SELECT completed_oid FROM updated_obj
            EXCEPT
            SELECT oid FROM objectives_to_suspend
          )
        ) a
        UNION
        SELECT 5, 'goals_to_delete' , COUNT(*)  FROM goals_to_delete
        UNION
        SELECT 6, 'updated_goals', COUNT(*)  FROM updated_goals
        UNION
        SELECT 7, 'mismatched deletions', COUNT(*) FROM (
          (
            SELECT gid FROM goals_to_delete
            EXCEPT
            SELECT deleted_gid FROM updated_goals
          )
          UNION
          (
            SELECT deleted_gid FROM updated_goals
            EXCEPT
            SELECT gid FROM goals_to_delete
          )
        ) a
        ORDER BY 1
        ;
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
