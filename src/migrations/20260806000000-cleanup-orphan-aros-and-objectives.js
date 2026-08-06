const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        /* sql */ `
        --------------------------------------------------------------------
        -- Clean up ActivityReportObjectives (ARO) and Objectives that are
        -- orphaned because their only linked ActivityReport(s) were deleted.
        --
        -- These are cleaned up separately: an Objective can be used on two
        -- reports where one is deleted and the other is not. In that case we
        -- only delete the ARO linked to the deleted report and keep both the
        -- Objective and the ARO linked to the live report.
        --
        -- 1) Hard-delete AROs linked to a deleted ActivityReport.
        --    ActivityReportObjectives is not paranoid, so this is a true
        --    delete; history is retained in the ZALActivityReportObjectives
        --    audit log. The ARO child records are removed first because the
        --    ActivityReportObjectiveFiles FK is NO ACTION (the rest cascade,
        --    but we clear them explicitly to mirror the model destroy hooks).
        -- 2) Soft-delete Objectives created via an activity report that are no
        --    longer used by any non-deleted report (their only AROs were on
        --    deleted reports, or they have no ARO at all). Objectives is
        --    paranoid, so this sets "deletedAt".
        -- 3) Resync Objectives."onAR" for objectives that survive the delete
        --    (shared with a live report, or createdVia='rtr'). The raw delete
        --    bypasses the ARO destroy hook that normally recalculates onAR, so
        --    we replicate it here to avoid a stale flag.
        --------------------------------------------------------------------

        -- 1: AROs whose ActivityReport is deleted. We capture objectiveId so we
        -- can resync Objectives."onAR" for surviving objectives after the delete.
        DROP TABLE IF EXISTS aros_to_delete;
        CREATE TEMP TABLE aros_to_delete AS
        SELECT aro.id AS aro_id, aro."objectiveId" AS objective_id
        FROM "ActivityReportObjectives" aro
        JOIN "ActivityReports" ar
          ON ar.id = aro."activityReportId"
        WHERE ar."calculatedStatus" = 'deleted';

        -- Remove ARO metadata children first
        DELETE FROM "ActivityReportObjectiveFiles"
        WHERE "activityReportObjectiveId" IN (SELECT aro_id FROM aros_to_delete);
        DELETE FROM "ActivityReportObjectiveResources"
        WHERE "activityReportObjectiveId" IN (SELECT aro_id FROM aros_to_delete);
        DELETE FROM "ActivityReportObjectiveTopics"
        WHERE "activityReportObjectiveId" IN (SELECT aro_id FROM aros_to_delete);
        DELETE FROM "ActivityReportObjectiveCourses"
        WHERE "activityReportObjectiveId" IN (SELECT aro_id FROM aros_to_delete);
        DELETE FROM "ActivityReportObjectiveCitations"
        WHERE "activityReportObjectiveId" IN (SELECT aro_id FROM aros_to_delete);

        -- Delete the AROs themselves
        DROP TABLE IF EXISTS deleted_aros;
        CREATE TEMP TABLE deleted_aros AS
        WITH del AS (
          DELETE FROM "ActivityReportObjectives"
          WHERE id IN (SELECT aro_id FROM aros_to_delete)
          RETURNING id
        )
        SELECT id FROM del;

        -- 2: Objectives created via an activity report that are no longer used
        -- by any non-deleted report. Evaluated after the ARO cleanup above so
        -- that objectives whose only AROs were just removed are also captured.
        DROP TABLE IF EXISTS objectives_to_delete;
        CREATE TEMP TABLE objectives_to_delete AS
        SELECT o.id AS objective_id
        FROM "Objectives" o
        WHERE o."createdVia" = 'activityReport'
          AND o."deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "ActivityReportObjectives" aro
            JOIN "ActivityReports" ar
              ON ar.id = aro."activityReportId"
            WHERE aro."objectiveId" = o.id
              AND ar."calculatedStatus" != 'deleted'
          );

        DROP TABLE IF EXISTS soft_deleted_objectives;
        CREATE TEMP TABLE soft_deleted_objectives AS
        WITH upd AS (
          UPDATE "Objectives" o
          SET "deletedAt" = NOW(),
              "updatedAt" = NOW()
          FROM objectives_to_delete otd
          WHERE o.id = otd.objective_id
          RETURNING o.id
        )
        SELECT id FROM upd;

        -- 3: Resync "onAR" for objectives whose AROs were removed but the
        -- objective itself survives (still used by a live report, or a non-AR
        -- objective such as createdVia='rtr'). onAR reflects whether the
        -- objective is linked to any ActivityReportObjective at all. Soft-deleted
        -- objectives are excluded via the "deletedAt" filter.
        DROP TABLE IF EXISTS resynced_objectives;
        CREATE TEMP TABLE resynced_objectives AS
        WITH upd AS (
          UPDATE "Objectives" o
          SET "onAR" = EXISTS (
                SELECT 1 FROM "ActivityReportObjectives" aro
                WHERE aro."objectiveId" = o.id
              ),
              "updatedAt" = NOW()
          WHERE o.id IN (SELECT DISTINCT objective_id FROM aros_to_delete)
            AND o."deletedAt" IS NULL
            AND o."onAR" IS DISTINCT FROM EXISTS (
                SELECT 1 FROM "ActivityReportObjectives" aro
                WHERE aro."objectiveId" = o.id
              )
          RETURNING o.id
        )
        SELECT id FROM upd;

        -- Validation output
        SELECT
          (SELECT COUNT(*) FROM deleted_aros) AS aros_deleted,
          (SELECT COUNT(*) FROM soft_deleted_objectives) AS objectives_soft_deleted,
          (SELECT COUNT(*) FROM resynced_objectives) AS objectives_onar_resynced;
        `,
        { transaction },
      );
    });
  },

  async down() {
    // no rollback — restore via the ZAL audit log if needed
  },
};
