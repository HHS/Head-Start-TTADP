module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      try {
        // The next two repairs are so that Goals and Objectives inheriting status change values from
        // their deduped siblings receive all the info they need. Trying to perform these fixes later
        // while retaining that inheritance would be very complicated.
        // -------------------------------------
        // Update Objectives with their proper stage dates from the audit log to repair an issue where
        // the values weren't being set on status change.
        await queryInterface.sequelize.query(
          `WITH
          obj_recovered_dates AS (
            SELECT
              data_id recovered_obj_id,
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Not Started') "firstNotStartedAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Not Started') "lastNotStartedAt",
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'In Progress') "firstInProgressAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'In Progress') "lastInProgressAt",
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Suspended') "firstSuspendedAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Suspended') "lastSuspendedAt",
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Complete') "firstCompleteAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Complete') "lastCompleteAt"
            FROM public."ZALObjectives"
            WHERE new_row_data ->> 'status' IS NOT NULL
            GROUP BY 1
          )
          UPDATE "Objectives" o
          SET
            "firstNotStartedAt" = ord."firstNotStartedAt",
            "lastNotStartedAt" = ord."lastNotStartedAt",
            "firstInProgressAt" = ord."firstInProgressAt",
            "lastInProgressAt" = ord."lastInProgressAt",
            "firstSuspendedAt" = ord."firstSuspendedAt",
            "lastSuspendedAt" = ord."lastSuspendedAt",
            "firstCompleteAt" = ord."firstCompleteAt",
            "lastCompleteAt" = ord."lastCompleteAt"
          FROM obj_recovered_dates ord
          WHERE o.id = recovered_obj_id
          ;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      try {
        // Update *Goals* with their proper stage dates from the audit log to repair an issue where
        // the values weren't being set on status change
        await queryInterface.sequelize.query(
          `WITH
          goal_recovered_dates AS (
            SELECT
              data_id recovered_goal_id,
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Not Started') "firstNotStartedAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Not Started') "lastNotStartedAt",
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'In Progress') "firstInProgressAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'In Progress') "lastInProgressAt",
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Suspended') "firstCeasedSuspendedAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Suspended') "lastCeasedSuspendedAt",
              MIN(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Closed') "firstClosedAt",
              MAX(dml_timestamp) FILTER (WHERE new_row_data ->> 'status' = 'Closed') "lastClosedAt"
            FROM public."ZALGoals"
            WHERE new_row_data ->> 'status' IS NOT NULL
            GROUP BY 1
          )
          UPDATE "Goals" g
          SET
            "firstNotStartedAt" = grd."firstNotStartedAt",
            "lastNotStartedAt" = grd."lastNotStartedAt",
            "firstInProgressAt" = grd."firstInProgressAt",
            "lastInProgressAt" = grd."lastInProgressAt",
            "firstCeasedSuspendedAt" = grd."firstCeasedSuspendedAt",
            "lastCeasedSuspendedAt" = grd."lastCeasedSuspendedAt",
            "firstClosedAt" = grd."firstClosedAt",
            "lastClosedAt" = grd."lastClosedAt"
          FROM goal_recovered_dates grd
          WHERE g.id = recovered_goal_id
          ;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      try {
        // 1. collect duplicate objectives based on matching title and goalId
        // 2. Merge two records into the original records
        // 3. Intermediate dataset
        // 4. Merge two records into the original records using the status of the newer
        // 5. Merge two records into the original records using the status of the older
        // 7. for each of the three datasets merge objectives into the older records as described
        // 8. create a unified list of affected objectives
        // 9. migrate/delete metadata table values from newer objectives into the older objectives
        // 10. migrate/merge/delete ARO records to use the older objectives
        // 11. delete the newer objectives
        // 12. results
        await queryInterface.sequelize.query(
          `WITH
          -- make easily sortable statuses
          status_order AS (
            SELECT
              'Not Started' AS statname,
              1 AS statrank
            UNION SELECT 'In Progress',2
            UNION SELECT 'Complete', 4
          ),
          -- collect duplicate objectives based on matching title and goalId
          grouped_objectives AS (
            SELECT
              *,
              COALESCE("goalId",0) || '-' || COALESCE("otherEntityId",0) || '-' || MD5(TRIM(title))
              AS group_id,
              CASE WHEN status = 'Complete' THEN 1 ELSE 0 END
              AS seq_end -- Complete objectives end a sequence within a group
            FROM "Objectives"
          ),
          -- break groups of duplicates into sets that will be consolidated to a single objective
          -- when a 'Complete' ends a sequence of duplicate objectives within a group, they form a set
          -- the complete objective will inherit all the data associated with the objectives of that set
          objective_sets AS (
            SELECT
              *,
                group_id || '-' ||
                SUM(seq_end) OVER (PARTITION BY group_id ORDER BY "updatedAt" DESC)
              AS obj_set_id
            FROM grouped_objectives
          ),
          set_aggregates AS (
            SELECT
              obj_set_id AS aggregate_osid,
              COUNT(*) AS os_count,
              TRIM(title) trimmed_title,
              MIN("createdAt") min_createdat,
              MAX("updatedAt") max_updatedat,
              MIN("objectiveTemplateId") min_obj_template_id,
              BOOL_OR("onApprovedAR") any_onapprovedar,
              MIN("firstNotStartedAt") new_fnotstartedat,
              MAX("lastNotStartedAt") new_lnotstartedat,
              MIN("firstInProgressAt") new_finprogressat,
              MAX("lastInProgressAt") new_linprogressat,
              MIN("firstCompleteAt") new_fcompleteat,
              MAX("lastCompleteAt") new_lcompleteat,
              MIN("firstSuspendedAt") new_fsuspendedat,
              MAX("lastSuspendedAt") new_lsuspendedat
            FROM objective_sets
            GROUP BY 1,3
            HAVING COUNT(*) > 1
          ),
          -- Rank objectives within sets to find the objective with the most-advanced status and latest update
          -- only one set within a dupe group can lack a Complete objective, so at most one objective per dupe group will survive deduping with a non-complete status
          ranked_objectives AS (
            SELECT
              *,
              ROW_NUMBER() OVER (PARTITION BY obj_set_id ORDER BY statrank DESC, "updatedAt" DESC)
              AS obj_rank
            FROM objective_sets os
            LEFT JOIN status_order so
              ON status = statname
          ),
          --- for each of the three datasets merge objectives into the older records as described
          updated_objectives AS (
            UPDATE "Objectives" o
            SET
              title = trimmed_title,
              "createdAt" = min_createdat,
              "updatedAt" = max_updatedat,
              "objectiveTemplateId" = min_obj_template_id,
              "onApprovedAR" = any_onapprovedar,
              "firstNotStartedAt" = new_fnotstartedat,
              "lastNotStartedAt" = new_lnotstartedat,
              "firstInProgressAt" = new_finprogressat,
              "lastInProgressAt" = new_linprogressat,
              "firstCompleteAt" = new_fcompleteat,
              "lastCompleteAt" = new_lcompleteat,
              "firstSuspendedAt" = new_fsuspendedat,
              "lastSuspendedAt" = new_lsuspendedat
            FROM ranked_objectives ro
            JOIN set_aggregates sa
              ON sa.aggregate_osid = ro.obj_set_id
            WHERE o.id = ro.id
              AND ro.obj_rank = 1
              AND sa.os_count > 1
            RETURNING
              o.id
          ),
          -- create a unified list of affected objectives and which objectives inherit their metadata
          affected_objectives AS (
            SELECT
              uo.id inheriting_oid,
              all_o.id donor_oid
            FROM updated_objectives uo
            JOIN objective_sets os
              ON uo.id = os.id
            JOIN objective_sets all_o
              ON os.obj_set_id = all_o.obj_set_id
          ),
          --- migrate/merge/delete metadata table values from newer objectives into the older objectives
          affected_objective_files AS (
            SELECT
              current_of.id,
              ao.inheriting_oid,
              COALESCE(current_of."fileId" = target_of."fileId",FALSE) is_duplicate
            FROM affected_objectives ao
            JOIN "ObjectiveFiles" current_of
              ON ao.donor_oid = current_of."objectiveId"
            LEFT JOIN "ObjectiveFiles" target_of
              ON ao.inheriting_oid = target_of."objectiveId"
            WHERE ao.inheriting_oid <> ao.donor_oid
          ),
          -- Move objective file links from deduped objectives to the inheriting objective, or delete the linking record if the file is a dupe
          migrated_objective_files AS (
            UPDATE "ObjectiveFiles" f
            SET
              "objectiveId" = aof.inheriting_oid
            FROM affected_objective_files aof
            WHERE aof.id = f.id
              AND NOT is_duplicate
            RETURNING
              aof.id
          ),
          deleted_objective_files AS (
            DELETE FROM "ObjectiveFiles" f
            USING affected_objective_files aof
            WHERE f.id = aof.id
              AND is_duplicate
            RETURNING
              aof.id
          ),
          affected_objective_resources AS (
            SELECT
              current_or.id,
              ao.inheriting_oid,
              COALESCE(current_or."userProvidedUrl" = target_or."userProvidedUrl",FALSE) is_duplicate
            FROM affected_objectives ao
            JOIN "ObjectiveResources" current_or
              ON ao.donor_oid = current_or."objectiveId"
            LEFT JOIN "ObjectiveResources" target_or
              ON ao.inheriting_oid = target_or."objectiveId"
            WHERE ao.inheriting_oid <> ao.donor_oid
          ),
          migrated_objective_resources AS (
            UPDATE "ObjectiveResources" r
            SET
              "objectiveId" = aor.inheriting_oid
            FROM affected_objective_resources aor
            WHERE aor.id = r.id
              AND NOT is_duplicate
            RETURNING
              aor.id
          ),
          deleted_objective_resources AS (
            DELETE FROM "ObjectiveResources" r
            USING affected_objective_resources aor
            WHERE r.id = aor.id
              AND is_duplicate
            RETURNING
              aor.id
          ),
          affected_objective_topics AS (
            SELECT
              current_ot.id,
              ao.inheriting_oid,
              COALESCE(current_ot."topicId" = target_ot."topicId",FALSE) is_duplicate
            FROM affected_objectives ao
            JOIN "ObjectiveTopics" current_ot
              ON ao.donor_oid = current_ot."objectiveId"
            LEFT JOIN "ObjectiveTopics" target_ot
              ON ao.inheriting_oid = target_ot."objectiveId"
            WHERE ao.inheriting_oid <> ao.donor_oid
          ),
          migrated_objective_topics AS (
            UPDATE "ObjectiveTopics" r
            SET
              "objectiveId" = aot.inheriting_oid
            FROM affected_objective_topics aot
            WHERE aot.id = r.id
              AND NOT is_duplicate
            RETURNING
              aot.id
          ),
          deleted_objective_topics AS (
            DELETE FROM "ObjectiveTopics" t
            USING affected_objective_topics aot
            WHERE t.id = aot.id
              AND is_duplicate
            RETURNING
              aot.id
          ),
          --- migrate/merge/delete ARO records to use the top ranked objectives
          affected_aros AS (
            SELECT
              current_aaro.id,
              ao.inheriting_oid,
              COALESCE(current_aaro."activityReportId" = target_aaro."activityReportId",FALSE) is_duplicate
            FROM affected_objectives ao
            JOIN "ActivityReportObjectives" current_aaro
              ON ao.donor_oid = current_aaro."objectiveId"
            LEFT JOIN "ActivityReportObjectives" target_aaro
              ON ao.inheriting_oid = target_aaro."objectiveId"
            WHERE ao.inheriting_oid <> ao.donor_oid
          ),
          migrated_aros AS (
            UPDATE "ActivityReportObjectives" aro
            SET
              "objectiveId" = aaro.inheriting_oid
            FROM affected_aros aaro
            WHERE aaro.id = aro.id
              AND NOT is_duplicate
            RETURNING
              aaro.id
          ),
          deleted_aros AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING affected_aros aaro
            WHERE aro.id = aaro.id
              AND is_duplicate
            RETURNING
              aaro.id
          ),
          --- delete the donor objectives
          deleted_objectives AS (
            DELETE FROM "Objectives" o
            USING affected_objectives ao
            WHERE o.id = ao.donor_oid
              AND ao.inheriting_oid <> ao.donor_oid
            RETURNING
              o.id
          )
          --- results
          SELECT 'updated_objectives', count(*)
          FROM updated_objectives
          UNION
          SELECT 'migrated_objective_files', count(*)
          FROM migrated_objective_files
          UNION
          SELECT 'deleted_objective_files', count(*)
          FROM deleted_objective_files
          UNION
          SELECT 'migrated_objective_resources', count(*)
          FROM migrated_objective_resources
          UNION
          SELECT 'deleted_objective_resources', count(*)
          FROM deleted_objective_resources
          UNION
          SELECT 'migrated_objective_topics', count(*)
          FROM migrated_objective_topics
          UNION
          SELECT 'deleted_objective_topics', count(*)
          FROM deleted_objective_topics
          UNION
          SELECT 'migrated_aros', count(*)
          FROM migrated_aros
          UNION
          SELECT 'deleted_aros', count(*)
          FROM deleted_aros
          UNION
          SELECT 'deleted_objectives', count(*)
          FROM deleted_objectives;
        `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
};
