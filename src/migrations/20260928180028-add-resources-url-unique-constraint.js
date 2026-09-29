const { prepMigration } = require('../lib/migration');

// Join tables that carry a "resourceId" foreign key into "Resources", along with the column
// that identifies which parent entity they belong to and whether they carry extra flag columns
// that need to be OR'd together when two rows are merged (only "GoalResources" does).
// (ObjectiveResources / ObjectiveTemplateResources were dropped by
// 20240531163151-remove-unused-objective-tables.)
const RESOURCE_REFERENCING_TABLES = [
    { table: 'ActivityReportResources', idColumn: 'activityReportId', hasArFlags: false },
    { table: 'ActivityReportGoalResources', idColumn: 'activityReportGoalId', hasArFlags: false },
    { table: 'ActivityReportObjectiveResources', idColumn: 'activityReportObjectiveId', hasArFlags: false },
    { table: 'GoalResources', idColumn: 'goalId', hasArFlags: true },
    { table: 'GoalTemplateResources', idColumn: 'goalTemplateId', hasArFlags: false },
    { table: 'NextStepResources', idColumn: 'nextStepId', hasArFlags: false },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface) =>
        queryInterface.sequelize.transaction(async (transaction) => {
            await prepMigration(queryInterface, transaction, __filename);

            // Duplicate "Resources" rows (same url) can exist because the previous race-prone
            // find-then-create logic allowed two concurrent requests to both insert a row for
            // the same url. Collapse each duplicate group onto the lowest id ("canonical" row)
            // before adding the unique constraint below.
            await queryInterface.sequelize.query(
        /* sql */ `
          DROP TABLE IF EXISTS tmp_resource_dedup;
          CREATE TEMP TABLE tmp_resource_dedup AS
          SELECT id, canonical_id
          FROM (
            SELECT id, MIN(id) OVER (PARTITION BY url) AS canonical_id
            FROM "Resources"
          ) x
          WHERE id <> canonical_id;
        `,
                { transaction }
            );

            // Repointing a join row's resourceId to the canonical id can make it collide with
            // another row that already referenced the same (parentId, canonical resourceId)
            // pair -- these tables key on a surrogate "id", so simply repointing the FK would
            // leave both rows in place. Merge every such colliding group onto its lowest-id row,
            // unioning "sourceFields" (and, for GoalResources, OR-ing the onAR/onApprovedAR
            // flags) before discarding the extra rows.
            // eslint-disable-next-line no-restricted-syntax
            for (const { table, idColumn, hasArFlags } of RESOURCE_REFERENCING_TABLES) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.sequelize.query(
          /* sql */ `
            DROP TABLE IF EXISTS tmp_join_merge;
            CREATE TEMP TABLE tmp_join_merge AS
            SELECT
              t.id,
              t."${idColumn}" AS parent_id,
              COALESCE(d.canonical_id, t."resourceId") AS target_resource_id
            FROM "${table}" t
            LEFT JOIN tmp_resource_dedup d ON d.id = t."resourceId";

            ALTER TABLE tmp_join_merge ADD COLUMN canonical_row_id INTEGER;
            UPDATE tmp_join_merge m
            SET canonical_row_id = c.min_id
            FROM (
              SELECT parent_id, target_resource_id, MIN(id) AS min_id
              FROM tmp_join_merge
              GROUP BY parent_id, target_resource_id
            ) c
            WHERE m.parent_id = c.parent_id AND m.target_resource_id = c.target_resource_id;

            WITH grouped AS (
              SELECT
                m.canonical_row_id,
                ARRAY_AGG(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) AS "sourceFields"
                ${hasArFlags ? ', BOOL_OR(t."onAR") AS "onAR", BOOL_OR(t."onApprovedAR") AS "onApprovedAR"' : ''}
              FROM tmp_join_merge m
              JOIN "${table}" t ON t.id = m.id
              LEFT JOIN LATERAL unnest(t."sourceFields") AS elem ON true
              GROUP BY m.canonical_row_id
            )
            UPDATE "${table}" t
            SET "sourceFields" = grouped."sourceFields"
              ${hasArFlags ? ', "onAR" = grouped."onAR", "onApprovedAR" = grouped."onApprovedAR"' : ''}
            FROM grouped
            WHERE t.id = grouped.canonical_row_id;

            UPDATE "${table}" t
            SET "resourceId" = m.target_resource_id
            FROM tmp_join_merge m
            WHERE t.id = m.canonical_row_id;

            DELETE FROM "${table}" t
            USING tmp_join_merge m
            WHERE t.id = m.id AND m.id <> m.canonical_row_id;

            DROP TABLE IF EXISTS tmp_join_merge;
          `,
                    { transaction }
                );
            }

            await queryInterface.sequelize.query(
        /* sql */ `
          UPDATE "Resources" r
          SET "mapsTo" = d.canonical_id
          FROM tmp_resource_dedup d
          WHERE r."mapsTo" = d.id;

          DELETE FROM "Resources"
          WHERE id IN (SELECT id FROM tmp_resource_dedup);

          DROP TABLE IF EXISTS tmp_resource_dedup;
        `,
                { transaction }
            );

            await queryInterface.sequelize.query(
        /* sql */ `
          CREATE UNIQUE INDEX "Resources_url_unique_idx" ON "Resources" (url);
          ALTER TABLE "Resources"
          ADD CONSTRAINT "Resources_url_unique_idx" UNIQUE USING INDEX "Resources_url_unique_idx";
        `,
                { transaction }
            );
        }),

    // NOTE: this only reverts the constraint/index -- it cannot undo the dedup above (merged
    // duplicate Resources rows and their re-pointed join-table references are gone for good).
    // There's no canonical way to un-merge deleted duplicates, so this down() is a one-way
    // trip for the data even though the schema change itself is fully reverted.
    down: async (queryInterface) =>
        queryInterface.sequelize.transaction(async (transaction) => {
            await prepMigration(queryInterface, transaction, __filename);

            await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "Resources" DROP CONSTRAINT IF EXISTS "Resources_url_unique_idx";
          DROP INDEX IF EXISTS "Resources_url_unique_idx";
        `,
                { transaction }
            );
        }),
};
