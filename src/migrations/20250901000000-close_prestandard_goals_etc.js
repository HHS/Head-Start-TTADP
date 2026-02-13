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
        -- 1: Find all Goals that are open FEI, Monitoring, or CLASS goals
        -- 2: Complete any In Progress Objectives not on those Goals
        -- 3: Close all other Goals
        -- 4: Delete any non-approved reports, of ANY kind.
        -- 5: Add the prestandard boolean column, making all closed records
        --    "true", but all future records "false" by default.
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
        UNION
        SELECT
          'ARs',
          COUNT(*) FILTER (WHERE "calculatedStatus" IN ('approved','deleted')),
          COUNT(*) FILTER (WHERE "calculatedStatus" IS NULL OR "calculatedStatus"  NOT IN ('approved','deleted'))
        FROM "ActivityReports"
        ORDER BY 1
        ;

        -- 1: Find all Goals that are open FEI, Monitoring, or CLASS goals
        DROP TABLE IF EXISTS retained_goals;
        CREATE TEMP TABLE retained_goals
        AS
        SELECT DISTINCT ON (g."grantId", g."goalTemplateId") g.id gid
        FROM "Goals" g
        JOIN "GoalTemplates" gt
          ON g."goalTemplateId" = gt.id
        WHERE gt."creationMethod" = 'Curated'
          AND gt.standard IN ('Monitoring','FEI','CLASS Monitoring')
          AND g.status != 'Closed'
          AND g."deletedAt" IS NULL
          AND g."mapsToParentGoalId" IS NULL
        ORDER BY g."grantId", g."goalTemplateId", g.id DESC
        ;

        -- 2: Complete any In Progress Objectives not on those Goals
        DROP TABLE IF EXISTS obj_to_complete;
        CREATE TEMP TABLE obj_to_complete
        AS
        SELECT DISTINCT
          o.id oid,
          o."otherEntityId" IS NOT NULL other_entity
        FROM "Objectives" o
        LEFT JOIN retained_goals
          ON o."goalId" = gid
        WHERE gid IS NULL
          AND o.status = 'In Progress'
          AND o."deletedAt" IS NULL
        ;
        
        UPDATE "Objectives" o
        SET
          status = 'Complete',
          "updatedAt" = NOW()
        FROM obj_to_complete
        WHERE id = oid
        ;

        -- 3: Close all other Goals
        DROP TABLE IF EXISTS goals_to_close;
        CREATE TEMP TABLE goals_to_close
        AS
        SELECT DISTINCT
          g.id gid
        FROM "Goals" g
        LEFT JOIN retained_goals
          ON g.id = gid
        WHERE gid IS NULL
          AND g.status != 'Closed'
          AND g."deletedAt" IS NULL
        ;

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
          "updatedAt" = NOW()
        FROM goals_to_close
        WHERE id = gid
        ;

        -- 4: Delete any non-approved reports, of ANY kind.
        DROP TABLE IF EXISTS deleted_activity_reports;
        CREATE TEMP TABLE deleted_activity_reports
        AS
        WITH updater AS (
        UPDATE "ActivityReports"
        SET
          "calculatedStatus" = 'deleted',
          "submissionStatus" = 'deleted',
          "updatedAt" = NOW()
        WHERE "calculatedStatus" IS NULL
          OR "calculatedStatus" NOT IN ('deleted','approved')
        RETURNING *
        )
        SELECT * FROM updater
        ;


        -- 5: Add the prestandard boolean column
        ALTER TABLE "Goals" ADD COLUMN prestandard BOOLEAN NOT NULL DEFAULT TRUE;
        UPDATE "Goals" SET prestandard = FALSE FROM retained_goals WHERE id = gid;
        ALTER TABLE "Goals" ALTER COLUMN prestandard SET DEFAULT FALSE;

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
        UNION
        SELECT
          'ARs',
          COUNT(*) FILTER (WHERE "calculatedStatus" IN ('approved','deleted')),
          COUNT(*) FILTER (WHERE "calculatedStatus" IS NULL OR "calculatedStatus"  NOT IN ('approved','deleted')),
          (SELECT COUNT(*) FROM deleted_activity_reports),
          NULL
        FROM "ActivityReports"
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

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        ALTER TABLE "Goals" DROP COLUMN "prestandard";
    `,
        { transaction }
      )
    })
  },
}
