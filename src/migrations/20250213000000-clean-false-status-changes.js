const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        -- Remove extra GoalStatusChange entries that:
        --  - were inserted when Goals didn't actually change status
        --  - are duplicate insertions of the same status change
        -- Also update Goals that have the incorrect "oldStatus" value.
        -- This appears to occur most often on the initial status change
        -- for a Goal when an associated Objective is designated as
        -- In Progress. Potentially that is also when the Goal was created

        DROP TABLE IF EXISTS marked_changes;
        CREATE TEMP TABLE marked_changes
        AS
        SELECT
          id gscid,
          "oldStatus" oldstat,
          "newStatus" newstat,
          LAG("newStatus") OVER (
              PARTITION BY "goalId"
              ORDER BY "createdAt", id
          ) real_previous_status,
          "newStatus" != COALESCE(
            LAG("newStatus") OVER (
              PARTITION BY "goalId"
              ORDER BY "createdAt", id
            ), 'NULL'
          ) isrealchange
        FROM "GoalStatusChanges" g
        ORDER BY "createdAt"
        ;

        -- Delete any Goal status changes that don't actually have a different
        -- newStatus value than the preceding record.
        DROP TABLE IF EXISTS deleted_gsc;
        CREATE TEMP TABLE deleted_gsc
        AS
        WITH updater AS (
        DELETE FROM "GoalStatusChanges"
        USING marked_changes
        WHERE id = gscid
          AND NOT isrealchange
        RETURNING id deleted_gscid
        )
        SELECT * FROM updater
        ;

        -- Correct any real Goal status changes that have incorrect oldStatus values
        DROP TABLE IF EXISTS updated_gsc;
        CREATE TEMP TABLE updated_gsc
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        UPDATE "GoalStatusChanges"
        SET
          "updatedAt" = nowts,
          "oldStatus" = real_previous_status
        FROM marked_changes
        CROSS JOIN nowtime
        WHERE id = gscid
          AND COALESCE("oldStatus",'NULL') != COALESCE(real_previous_status,'NULL')
        RETURNING id updated_gscid
        )
        SELECT * FROM updater
        ;

        DROP TABLE IF EXISTS remarked_changes;
        CREATE TEMP TABLE remarked_changes
        AS
        SELECT
          id gscid,
          "oldStatus" oldstat,
          "newStatus" newstat,
          LAG("newStatus") OVER (
              PARTITION BY "goalId"
              ORDER BY "createdAt", id
          ) real_previous_status,
          "newStatus" != COALESCE(
            LAG("newStatus") OVER (
              PARTITION BY "goalId"
              ORDER BY "createdAt", id
            ), 'NULL'
          ) isrealchange
        FROM "GoalStatusChanges" g
        ORDER BY "createdAt"
        ;
        

        -- Check the math in the total_records column. same_statuses is just context.
        -- needs_update and needs_delete should also match up and end 0
        SELECT
          1 ord,
          COUNT(*) total_records,
          COUNT(*) FILTER (WHERE oldstat = newstat) same_statuses,
          COUNT(*) FILTER (WHERE isrealchange AND COALESCE(oldstat,'NULL') != COALESCE(real_previous_status,'NULL')) needs_update,
          COUNT(*) FILTER (WHERE NOT isrealchange) needs_delete
        FROM marked_changes
        GROUP BY 1
        UNION
        SELECT
          2 ord,
          -(SELECT COUNT(*) FROM deleted_gsc),
          NULL,
          -(SELECT COUNT(*) FROM updated_gsc),
          -(SELECT COUNT(*) FROM deleted_gsc)
        UNION
        SELECT
          3 ord,
          COUNT(*) total_records,
          COUNT(*) FILTER (WHERE oldstat = newstat) same_statuses,
          COUNT(*) FILTER (WHERE isrealchange AND COALESCE(oldstat,'NULL') != COALESCE(real_previous_status,'NULL'))  needs_update,
          COUNT(*) FILTER (WHERE NOT isrealchange) needs_delete
        FROM remarked_changes
        GROUP BY 1
        ORDER BY 1
        ;
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
