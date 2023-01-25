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
        // The next two repairs are so that Goals and Objectives inheriting status change values
        // from their deduped siblings receive all the info they need. Trying to perform these
        // fixes later while retaining that inheritance would be very complicated.
        // -------------------------------------
        // Update Objectives with their proper stage dates from the audit log to repair an issue
        // where the values weren't being set on status change.
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
        // 1. Group objectives based on matching title and goalId (or otherEntityId)
        // 2. Break groups into sets of valid objective status cycles. That is, if one objective
        //    in the group of potential dupes gets completed but another objective is updated
        //    afterwards, then the other objective starts a new cycle. This is to prevent
        //    separate efforts from being collapsed into one. 
        // 3. Perform aggregations in the set to generate more correct stage start/stops & etc
        // 4. Rank all the objectives in each set of duplicates to determine which should
        //    inherit all the work tracked for all the duplicates in that set
        // 5. Update the top ranked objectives in each set with the aggregate values
        // 6. Create a list of all objectives in all dupe sets paired with their inheriting
        //    objectives as returned from step 5.
        // 7. For each of Resources, Files, and Topics:
        //    7a. List out the Resources/Files/Topics linked to the 'donor' duplicates and the
        //        inheriting objective to which they should link, and rank all the link files
        //        that would become duplicates linking to the same Resource/File/Topic after
        //        consolidating on the inheriting objective
        //    7b. Reassign the non-duplicate Resources/Files/Topics to the inheriting objective
        //    7c. Delete duplicates.
        // 8. For AROs, do the same as for Resources & etc, but they have their own TTA Provided
        //    and linking data, so the ARO version of step 7a contains extra info.
        // 9. Concatenate together any different TTA Provided values into the inheriting ARO
        // 10. After performing the ARO reassignment, perform a version of step 7 for each of
        //     Resources(i.e. ActivityReportObjectiveResources), Files, and Topics.
        // 11. When all the ARO linking records are updated or deleted, return to delete AROs
        // 12. Delete the newer objectives
        // 13. Print results
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
              of.id,
              ao.inheriting_oid,
              ROW_NUMBER() OVER (
                PARTITION BY ao.inheriting_oid, of."fileId"
                ORDER BY "createdAt", of.id
              ) AS dupe_rank,
              ao.donor_oid = ao.inheriting_oid AS on_inheriting_obj
            FROM affected_objectives ao
            JOIN "ObjectiveFiles" of
              ON ao.donor_oid = of."objectiveId"
            WHERE ao.inheriting_oid <> ao.donor_oid
          ),
          -- Move objective file links from deduped objectives to the inheriting objective, or delete the linking record if the file is a dupe
          migrated_objective_files AS (
            UPDATE "ObjectiveFiles" f
            SET
              "objectiveId" = aof.inheriting_oid
            FROM affected_objective_files aof
            WHERE aof.id = f.id
              AND NOT on_inheriting_obj
              AND dupe_rank = 1
            RETURNING
              aof.id
          ),
          deleted_objective_files AS (
            DELETE FROM "ObjectiveFiles" f
            USING affected_objective_files aof
            WHERE f.id = aof.id
              AND dupe_rank > 1
            RETURNING
              aof.id
          ),
          affected_objective_resources AS (
            SELECT
              or_.id,
              ao.inheriting_oid,
              ROW_NUMBER() OVER (
                PARTITION BY ao.inheriting_oid, or_."userProvidedUrl"
                ORDER BY "createdAt", or_.id
              ) AS dupe_rank,
              ao.donor_oid = ao.inheriting_oid AS on_inheriting_obj
            FROM affected_objectives ao
            JOIN "ObjectiveResources" or_
              ON ao.donor_oid = or_."objectiveId"
          ),
          migrated_objective_resources AS (
            UPDATE "ObjectiveResources" r
            SET
              "objectiveId" = aor.inheriting_oid
            FROM affected_objective_resources aor
            WHERE aor.id = r.id
              AND NOT on_inheriting_obj
              AND dupe_rank = 1
            RETURNING
              aor.id
          ),
          deleted_objective_resources AS (
            DELETE FROM "ObjectiveResources" r
            USING affected_objective_resources aor
            WHERE r.id = aor.id
              AND dupe_rank > 1
            RETURNING
              aor.id
          ),
          affected_objective_topics AS (
            SELECT
              ot.id,
              ao.inheriting_oid,
              ROW_NUMBER() OVER (
                PARTITION BY ao.inheriting_oid, ot."topicId"
                ORDER BY "createdAt", ot.id
              ) AS dupe_rank,
              ao.donor_oid = ao.inheriting_oid AS on_inheriting_obj
            FROM affected_objectives ao
            JOIN "ObjectiveTopics" ot
              ON ao.donor_oid = ot."objectiveId"
          ),
          migrated_objective_topics AS (
            UPDATE "ObjectiveTopics" r
            SET
              "objectiveId" = aot.inheriting_oid
            FROM affected_objective_topics aot
            WHERE aot.id = r.id
              AND NOT on_inheriting_obj
              AND dupe_rank = 1
            RETURNING
              aot.id
          ),
          deleted_objective_topics AS (
            DELETE FROM "ObjectiveTopics" t
            USING affected_objective_topics aot
            WHERE t.id = aot.id
              AND dupe_rank > 1
            RETURNING
              aot.id
          ),
          --- migrate/merge/delete ARO records to use the top ranked objectives
          ranked_aros AS (
            SELECT
              aro.id,
              ao.inheriting_oid,
              ROW_NUMBER() OVER (
                PARTITION BY ao.inheriting_oid, aro."activityReportId"
                ORDER BY "createdAt", aro.id
              ) AS dupe_rank,
              ao.donor_oid = ao.inheriting_oid AS on_inheriting_obj,
              aro."activityReportId" ar_id,
              aro."ttaProvided" tta_provided
            FROM affected_objectives ao
            JOIN "ActivityReportObjectives" aro
              ON ao.donor_oid = aro."objectiveId"
          ),
          affected_aros AS (
            SELECT
              raro.id,
              raro.inheriting_oid,
              raro.dupe_rank,
              raro.on_inheriting_obj,
              raro.ar_id,
              top_rank.id inheriting_aroid
            FROM ranked_aros raro
            JOIN ranked_aros top_rank
              ON raro.inheriting_oid = top_rank.inheriting_oid
              AND raro.ar_id = top_rank.ar_id
              AND top_rank.dupe_rank = 1
          ),
          -- Handle the possibility that different AROs for different duplicate Objs have different ttaProvided
          -- This is more of a theoretical issue than one we expect to see in the data,
          -- so it will hopefully do nothing, but this assures that if they do exist, the
          -- different texts aren't lost, merely concatenated.
          tta_provided_agg AS (
            SELECT
              inheriting_oid,
              ar_id,
              STRING_AGG(DISTINCT tta_provided, ', ') tta_provided_concat
            FROM ranked_aros
            GROUP BY 1,2
          ),
          -- Doing the update here even if it's already on the inheriting objective because of
          -- the tta provided concatenation
          migrated_aros AS (
            UPDATE "ActivityReportObjectives" aro
            SET
              "objectiveId" = aaro.inheriting_oid,
              "ttaProvided" = tta_provided_concat
            FROM affected_aros aaro
            JOIN tta_provided_agg tpa
              ON tpa.inheriting_oid = aaro.inheriting_oid
              AND aaro.ar_id = tpa.ar_id
            WHERE aaro.id = aro.id
              AND dupe_rank = 1
            RETURNING
              aaro.id
          ),
          -- do the same migrations with linking records attaching to AROs as were done with
          -- linking records attaching to Objectives
          affected_aro_files AS (
            SELECT
              arof.id,
              aaro.inheriting_aroid,
              ROW_NUMBER() OVER (
                PARTITION BY arof."fileId", aaro.inheriting_aroid
                ORDER BY aaro.dupe_rank, arof.id
              ) AS dupe_rank,
              aaro.dupe_rank = 1 AS on_inheriting_aro
            FROM affected_aros aaro
            JOIN "ActivityReportObjectiveFiles" arof
              ON aaro.id = arof."activityReportObjectiveId"
          ),
          migrated_aro_files AS (
            UPDATE "ActivityReportObjectiveFiles" arof
            SET
              "activityReportObjectiveId" = inheriting_aroid
            FROM affected_aro_files aarof
            WHERE aarof.id = arof.id
              AND dupe_rank = 1
              AND NOT on_inheriting_aro
            RETURNING
              arof.id
          ),
          deleted_aro_files AS (
            DELETE FROM "ActivityReportObjectiveFiles" arof
            USING affected_aro_files aarof
            WHERE aarof.id = arof.id
              AND dupe_rank > 1
            RETURNING
              arof.id
          ),
          affected_aro_resources AS (
            SELECT
              aror.id,
              aaro.inheriting_aroid,
              ROW_NUMBER() OVER (
                PARTITION BY aaro.inheriting_aroid, aror."userProvidedUrl"
                ORDER BY aaro.dupe_rank, aror.id
              ) AS dupe_rank,
              aaro.dupe_rank = 1 AS on_inheriting_aro
            FROM affected_aros aaro
            JOIN "ActivityReportObjectiveResources" aror
              ON aaro.id = aror."activityReportObjectiveId"
          ),
          migrated_aro_resources AS (
            UPDATE "ActivityReportObjectiveResources" aror
            SET
              "activityReportObjectiveId" = inheriting_aroid
            FROM affected_aro_resources aaror
            WHERE aaror.id = aror.id
              AND dupe_rank = 1
              AND NOT on_inheriting_aro
            RETURNING
              aror.id
          ),
          deleted_aro_resources AS (
            DELETE FROM "ActivityReportObjectiveResources" aror
            USING affected_aro_resources aaror
            WHERE aaror.id = aror.id
              AND dupe_rank > 1
            RETURNING
              aror.id
          ),
          affected_aro_topics AS (
            SELECT
              arot.id,
              aaro.inheriting_aroid,
              ROW_NUMBER() OVER (
                PARTITION BY aaro.inheriting_aroid, arot."topicId"
                ORDER BY aaro.dupe_rank, arot.id
              ) AS dupe_rank,
              aaro.dupe_rank = 1 AS on_inheriting_aro
            FROM affected_aros aaro
            JOIN "ActivityReportObjectiveTopics" arot
              ON aaro.id = arot."activityReportObjectiveId"
          ),
          migrated_aro_topics AS (
            UPDATE "ActivityReportObjectiveTopics" arot
            SET
              "activityReportObjectiveId" = inheriting_aroid
            FROM affected_aro_topics aarot
            WHERE aarot.id = arot.id
              AND dupe_rank = 1
              AND NOT on_inheriting_aro
            RETURNING
              arot.id
          ),
          deleted_aro_topics AS (
            DELETE FROM "ActivityReportObjectiveTopics" arot
            USING affected_aro_topics aarot
            WHERE aarot.id = arot.id
              AND dupe_rank > 1
            RETURNING
              arot.id
          ),
          deleted_aros AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING affected_aros aaro
            WHERE aro.id = aaro.id
              AND dupe_rank > 1
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
          SELECT 'migrated_aro_files', count(*)
          FROM migrated_aro_files
          UNION
          SELECT 'deleted_aro_files', count(*)
          FROM deleted_aro_files
          UNION
          SELECT 'migrated_aro_resources', count(*)
          FROM migrated_aro_resources
          UNION
          SELECT 'deleted_aro_resources', count(*)
          FROM deleted_aro_resources
          UNION
          SELECT 'migrated_aro_topics', count(*)
          FROM migrated_aro_topics
          UNION
          SELECT 'deleted_aro_topics', count(*)
          FROM deleted_aro_topics
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
