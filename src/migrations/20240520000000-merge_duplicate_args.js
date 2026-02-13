const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        `

      -- Creating it as a function because we'll need to rerun this in the future
      -- up until and unless all issues producing duplicate ARGs are addressed

      CREATE OR REPLACE FUNCTION dedupe_args()
      RETURNS VOID LANGUAGE plpgsql AS
      $$
      BEGIN
      -- There are some duplicate ARGs, meaning link records that connect the same
      -- AR-Goal pairs. This migration merges them down to the link record that was
      -- most recently updated and thus presumably has the latest status & etc.
      -- Merging rather than simply deleting is necessary to account for
      -- ActivityReportGoalFieldResponses and ActivityReportGoalResources, both of
      -- which link to ARGs and so may need to be moved and deconflicted.
      -- Neither ActivityReportGoalResources nor ActivityReportGoalFieldResponses
      -- have applicable records at time of writing, but this may not remain true in
      -- the future when this runs.

      DROP TABLE IF EXISTS arg_merges;
      CREATE TEMP TABLE arg_merges
      AS
      WITH link_counts AS (
      SELECT
        "activityReportId" arid,
        "goalId" gid,
        COUNT(*) link_cnt
      FROM "ActivityReportGoals"
      GROUP BY 1,2
      ),
      latest_updated AS (
      SELECT
        arid,
        gid,
        arg.id argid,
        ROW_NUMBER() OVER (
          PARTITION BY arid,gid
          ORDER BY "updatedAt" DESC, arg.id
        ) updated_rank
      FROM "ActivityReportGoals" arg
      JOIN link_counts
        ON "activityReportId" = arid
        AND "goalId" = gid
      WHERE link_cnt > 1
      )
      SELECT
        id donor_arg,
        argid target_arg
      FROM "ActivityReportGoals" arg
      JOIN latest_updated
        ON "activityReportId" = arid
        AND "goalId" = gid
        AND updated_rank = 1
      ;

      -- Relink any ActivityReportGoalFieldResponses connected to the
      -- duplicate (and therefore donor) ARG
      -- Because there could theoretically be multiple prompts on
      -- multiple duplicates, we need to rank the ARGFRs referring to
      -- a particular prompt-goal pair and select just one of each.
      -- There's one target_arg per goal so we use that as a proxy.
      -- Just for simplicity, ARGFRs that are already on the target
      -- ARG are left alone and the corresponding responses on donors
      -- will be deleted.
      --
      -- At time of writing this is all theoretical as there aren't
      -- any reponses at all for FEI goals with duplicate ARGs, but this
      -- could change by the time it runs
      DROP TABLE IF EXISTS relinked_argfrs;
      CREATE TEMP TABLE relinked_argfrs
      AS
      WITH updater AS (
        WITH argfr_on_donor_args AS (
          SELECT
            donor_arg,
            target_arg,
            argfr."activityReportGoalId" argid,
            argfr."goalTemplateFieldPromptId" promptid,
            argfr.id argfrid,
            ROW_NUMBER() OVER (
              PARTITION BY arg."goalId", argfr."goalTemplateFieldPromptId"
              ORDER BY argfr."activityReportGoalId" = target_arg DESC, argfr."updatedAt" DESC, argfr.id
            ) choice_rank
          FROM arg_merges am
          JOIN "ActivityReportGoals" arg
            ON donor_arg = arg.id
          JOIN "ActivityReportGoalFieldResponses" argfr
            ON am.donor_arg = argfr."activityReportGoalId"
        ), unmatched AS (
          SELECT
            donor_arg,
            argid,
            argfrid
          FROM argfr_on_donor_args aoda
          WHERE choice_rank = 1
            AND argid != target_arg
        )
        UPDATE "ActivityReportGoalFieldResponses" AS argfr
        SET "activityReportGoalId" = target_arg
        FROM arg_merges am
        JOIN unmatched u
          ON u.donor_arg = am.donor_arg
        WHERE argfr.id = u.argfrid
        RETURNING
          id argfrid,
          am.donor_arg original_arg
      ) SELECT * FROM updater
      ;

      -- Delete duplicate objective ARGFRs
      DROP TABLE IF EXISTS deleted_argfrs;
      CREATE TEMP TABLE deleted_argfrs
      AS
      WITH updater AS (
        DELETE FROM "ActivityReportGoalFieldResponses"
        USING arg_merges
        WHERE "activityReportGoalId" = donor_arg
          AND target_arg != donor_arg
        RETURNING
          id argfrid,
          donor_arg
      ) SELECT * FROM updater
      ;

      -- Relink any ActivityReportGoalResources connected to the
      -- duplicate (and therefore donor) ARG
      -- Because there could theoretically be multiple resources on
      -- multiple duplicates, we need to rank the ARGRs referring to
      -- a particular resource-goal pair and select just one of each.
      -- There's one target_arg per goal so we use that as a proxy.
      -- Just for simplicity, ARGRs that are already on the target
      -- ARG are left alone and the corresponding responses on donors
      -- will be deleted.
      --
      -- At time of writing this is all theoretical as there aren't
      -- any ARGRs at all but this could change by the time it runs
      DROP TABLE IF EXISTS relinked_argrs;
      CREATE TEMP TABLE relinked_argrs
      AS
      WITH updater AS (
        WITH argr_on_donor_args AS (
          SELECT
            donor_arg,
            target_arg,
            argr."activityReportGoalId" argid,
            argr."resourceId" resourceid,
            argr.id argrid,
            ROW_NUMBER() OVER (
              PARTITION BY arg."goalId", argr."resourceId"
              ORDER BY argr."activityReportGoalId" = target_arg DESC, argr."updatedAt" DESC, argr.id
            ) choice_rank
          FROM arg_merges am
          JOIN "ActivityReportGoals" arg
            ON donor_arg = arg.id
          JOIN "ActivityReportGoalResources" argr
            ON am.donor_arg = argr."activityReportGoalId"
        ), unmatched AS (
          SELECT
            donor_arg,
            argid,
            argrid
          FROM argr_on_donor_args aoda
          WHERE choice_rank = 1
            AND argid != target_arg
        )
        UPDATE "ActivityReportGoalResources" AS argr
        SET "activityReportGoalId" = target_arg
        FROM arg_merges am
        JOIN unmatched u
          ON u.donor_arg = am.donor_arg
        WHERE argr.id = u.argrid
        RETURNING
          id argrid,
          am.donor_arg original_arg
      ) SELECT * FROM updater
      ;
      -- Delete duplicate objective ARGRs
      DROP TABLE IF EXISTS deleted_argrs;
      CREATE TEMP TABLE deleted_argrs
      AS
      WITH updater AS (
        DELETE FROM "ActivityReportGoalResources"
        USING arg_merges
        WHERE "activityReportGoalId" = donor_arg
        RETURNING
          id argrid,
          donor_arg
      ) SELECT * FROM updater
      ;

      -- Delete duplicate ARGs
      DROP TABLE IF EXISTS deleted_args;
      CREATE TEMP TABLE deleted_args
      AS
      WITH updater AS (
        DELETE FROM "ActivityReportGoals"
        USING arg_merges
        WHERE id = donor_arg
          AND target_arg != donor_arg
        RETURNING
          donor_arg
      ) SELECT * FROM updater
      ;

      END
      $$
      ;
      -- Actually call the function
      SELECT dedupe_args();

      SELECT
        1 op_order,
        'relinked_argfrs' op_name,
        COUNT(*) record_cnt
      FROM relinked_argfrs
      UNION SELECT 2, 'deleted_argfrs', COUNT(*) FROM deleted_argfrs
      UNION SELECT 3, 'relinked_argrs', COUNT(*) FROM relinked_argrs
      UNION SELECT 4, 'deleted_argrs', COUNT(*) FROM deleted_argrs
      UNION SELECT 5, 'deleted_args', COUNT(*) FROM deleted_args
      ORDER BY 1;
      `,
        { transaction }
      )
    })
  },
  async down() {
    // rolling back merges and deletes would be a mess
  },
}
