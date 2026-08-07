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
        --    audit log. The ARO child link rows (Files/Resources/Topics/Courses/
        --    Citations) are removed first because their FKs are NO ACTION.
        --    NOTE: the underlying Files and Resources themselves are
        --    intentionally NOT deleted here -- orphaned Files/Resources are
        --    reclaimed by the maintenance jobs from the dangling link rows,
        --    consistent with existing migrations (see
        --    20240708000000-remove_national_center_ars).
        -- 2) Soft-delete Objectives created via an activity report that are no
        --    longer used by any non-deleted report (their only AROs were on
        --    deleted reports, or they have no ARO at all). Objectives is
        --    paranoid, so this sets "deletedAt".
        -- 3) Resync Objectives."onAR" for objectives that survive the delete
        --    (shared with a live report, or createdVia='rtr'). The raw delete
        --    bypasses the ARO destroy hook that normally recalculates onAR, so
        --    we replicate it here to avoid a stale flag.
        -- 4) Mirror the ARO beforeDestroy hook (autoCleanupLinker): trim the
        --    deleted report ids out of the "Linker" ObjectiveCollaborator
        --    linkBack ({"activityReportIds":[...]}), and soft-delete any Linker
        --    collaborator left with no remaining report links.
        --------------------------------------------------------------------

        -- 1: AROs whose ActivityReport is deleted. We capture objectiveId and
        -- activityReportId so we can resync Objectives."onAR" and clean up the
        -- Linker collaborators for surviving objectives after the delete.
        DROP TABLE IF EXISTS aros_to_delete;
        CREATE TEMP TABLE aros_to_delete AS
        SELECT
          aro.id AS aro_id,
          aro."objectiveId" AS objective_id,
          aro."activityReportId" AS activity_report_id
        FROM "ActivityReportObjectives" aro
        JOIN "ActivityReports" ar
          ON ar.id = aro."activityReportId"
        WHERE ar."calculatedStatus" = 'deleted';

        -- Remove ARO metadata child link rows first (their FKs are NO ACTION).
        -- The Files/Resources themselves are left for the maintenance jobs.
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

        -- 4: Mirror the ARO beforeDestroy hook (autoCleanupLinker). Remove the
        -- deleted report ids from the "Linker" ObjectiveCollaborator linkBack so
        -- no linker points at a deleted report.
        DROP TABLE IF EXISTS linker_report_removals;
        CREATE TEMP TABLE linker_report_removals AS
        SELECT objective_id, ARRAY_AGG(DISTINCT activity_report_id) AS removed_ar_ids
        FROM aros_to_delete
        GROUP BY objective_id;

        DROP TABLE IF EXISTS trimmed_linkers;
        CREATE TEMP TABLE trimmed_linkers AS
        WITH upd AS (
          UPDATE "ObjectiveCollaborators" oc
          SET "linkBack" = jsonb_set(
                oc."linkBack",
                '{activityReportIds}',
                COALESCE(
                  (
                    SELECT jsonb_agg(elem::int)
                    FROM jsonb_array_elements_text(oc."linkBack"->'activityReportIds') AS elem
                    WHERE (elem::int) <> ALL (lrr.removed_ar_ids)
                  ),
                  '[]'::jsonb
                )
              ),
              "updatedAt" = NOW()
          FROM linker_report_removals lrr
          JOIN "CollaboratorTypes" ct ON ct.name = 'Linker'
          JOIN "ValidFor" vf ON vf.id = ct."validForId" AND vf.name = 'Objectives'
          WHERE oc."collaboratorTypeId" = ct.id
            AND oc."objectiveId" = lrr.objective_id
            AND oc."deletedAt" IS NULL
            AND oc."linkBack" ? 'activityReportIds'
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(oc."linkBack"->'activityReportIds') e
              WHERE (e::int) = ANY (lrr.removed_ar_ids)
            )
          RETURNING oc.id
        )
        SELECT id FROM upd;

        -- Soft-delete Linker collaborators whose only link was to the deleted
        -- report(s) (activityReportIds is now empty and no other keys remain).
        -- ObjectiveCollaborators is paranoid, mirroring the runtime destroy.
        DROP TABLE IF EXISTS deleted_linkers;
        CREATE TEMP TABLE deleted_linkers AS
        WITH del AS (
          UPDATE "ObjectiveCollaborators" oc
          SET "deletedAt" = NOW(), "updatedAt" = NOW()
          FROM "CollaboratorTypes" ct
          JOIN "ValidFor" vf ON vf.id = ct."validForId" AND vf.name = 'Objectives'
          WHERE ct.name = 'Linker'
            AND oc."collaboratorTypeId" = ct.id
            AND oc."deletedAt" IS NULL
            AND oc."linkBack" ? 'activityReportIds'
            AND jsonb_array_length(oc."linkBack"->'activityReportIds') = 0
            AND (oc."linkBack" - 'activityReportIds') = '{}'::jsonb
            AND oc."objectiveId" IN (SELECT DISTINCT objective_id FROM aros_to_delete)
          RETURNING oc.id
        )
        SELECT id FROM del;

        -- Validation output
        SELECT
          (SELECT COUNT(*) FROM deleted_aros) AS aros_deleted,
          (SELECT COUNT(*) FROM soft_deleted_objectives) AS objectives_soft_deleted,
          (SELECT COUNT(*) FROM resynced_objectives) AS objectives_onar_resynced,
          (SELECT COUNT(*) FROM trimmed_linkers) AS linkers_trimmed,
          (SELECT COUNT(*) FROM deleted_linkers) AS linkers_soft_deleted;
        `,
        { transaction },
      );
    });
  },

  async down() {
    // no rollback — restore via the ZAL audit log if needed
  },
};
