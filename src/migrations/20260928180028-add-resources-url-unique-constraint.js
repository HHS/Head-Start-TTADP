const { prepMigration } = require('../lib/migration');

// Join tables that carry a "resourceId" foreign key into "Resources".
// (ObjectiveResources / ObjectiveTemplateResources were dropped by
// 20240531163151-remove-unused-objective-tables.)
const RESOURCE_REFERENCING_TABLES = [
    'ActivityReportResources',
    'ActivityReportGoalResources',
    'ActivityReportObjectiveResources',
    'GoalResources',
    'GoalTemplateResources',
    'NextStepResources',
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

            // eslint-disable-next-line no-restricted-syntax
            for (const table of RESOURCE_REFERENCING_TABLES) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.sequelize.query(
          /* sql */ `
            UPDATE "${table}" t
            SET "resourceId" = d.canonical_id
            FROM tmp_resource_dedup d
            WHERE t."resourceId" = d.id;
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
          ADD CONSTRAINT "Resources_url_unique" UNIQUE USING INDEX "Resources_url_unique_idx";
        `,
                { transaction }
            );
        }),

    down: async (queryInterface) =>
        queryInterface.sequelize.transaction(async (transaction) => {
            await prepMigration(queryInterface, transaction, __filename);

            await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "Resources" DROP CONSTRAINT IF EXISTS "Resources_url_unique";
          DROP INDEX IF EXISTS "Resources_url_unique_idx";
        `,
                { transaction }
            );
        }),
};
