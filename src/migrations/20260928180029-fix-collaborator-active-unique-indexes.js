const { prepMigration } = require('../lib/migration');

// (tableName, idColumn) pairs for the *Collaborators tables.
const COLLABORATOR_TABLES = [
    { table: 'GoalCollaborators', idColumn: 'goalId' },
    { table: 'ObjectiveCollaborators', idColumn: 'objectiveId' },
    { table: 'GroupCollaborators', idColumn: 'groupId' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface) =>
        queryInterface.sequelize.transaction(async (transaction) => {
            await prepMigration(queryInterface, transaction, __filename);

            // eslint-disable-next-line no-restricted-syntax
            for (const { table, idColumn } of COLLABORATOR_TABLES) {
                // The existing unique index/constraint on (idColumn, userId, collaboratorTypeId,
                // deletedAt) does NOT actually prevent duplicate active rows: SQL unique constraints
                // treat every NULL "deletedAt" value as distinct from every other NULL, so two
                // non-deleted rows for the same (idColumn, userId, collaboratorTypeId) can coexist.
                // Merge and dedupe any such active duplicates onto the lowest id before replacing the
                // index with a partial one scoped to `WHERE "deletedAt" IS NULL`, which correctly
                // enforces uniqueness among active rows.
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.sequelize.query(
          /* sql */ `
            DROP TABLE IF EXISTS tmp_collaborator_dedup;
            CREATE TEMP TABLE tmp_collaborator_dedup AS
            SELECT id, MIN(id) OVER (PARTITION BY "${idColumn}", "userId", "collaboratorTypeId") AS canonical_id
            FROM "${table}"
            WHERE "deletedAt" IS NULL;

            -- Union array-valued linkBack keys across each duplicate group onto the canonical row.
            WITH expanded AS (
              SELECT d.canonical_id, kv.key, jsonb_array_elements_text(kv.value) AS elem
              FROM "${table}" t
              JOIN tmp_collaborator_dedup d ON d.id = t.id
              CROSS JOIN LATERAL jsonb_each(COALESCE(t."linkBack", '{}'::jsonb)) AS kv
              WHERE jsonb_typeof(kv.value) = 'array'
            ),
            merged AS (
              SELECT canonical_id, jsonb_object_agg(key, arr) AS "linkBack"
              FROM (
                SELECT canonical_id, key, jsonb_agg(DISTINCT elem) AS arr
                FROM expanded
                GROUP BY canonical_id, key
              ) grouped
              GROUP BY canonical_id
            )
            UPDATE "${table}" t
            SET "linkBack" = merged."linkBack"
            FROM merged
            WHERE t.id = merged.canonical_id;

            DELETE FROM "${table}"
            WHERE id IN (SELECT id FROM tmp_collaborator_dedup WHERE id <> canonical_id);

            DROP TABLE IF EXISTS tmp_collaborator_dedup;
          `,
                    { transaction }
                );
            }

            await queryInterface.sequelize.query(
        /* sql */ `
          ALTER TABLE "GoalCollaborators" DROP CONSTRAINT IF EXISTS "GoalCollaborators_goalId_userId_collaboratorTypeId_unique";
          DROP INDEX IF EXISTS "GoalCollaborators_goalId_userId_collaboratorTypeId_unique";
          CREATE UNIQUE INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_active"
          ON "GoalCollaborators" ("goalId", "userId", "collaboratorTypeId")
          WHERE "deletedAt" IS NULL;

          ALTER TABLE "ObjectiveCollaborators" DROP CONSTRAINT IF EXISTS "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un";
          DROP INDEX IF EXISTS "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un";
          CREATE UNIQUE INDEX "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_act"
          ON "ObjectiveCollaborators" ("objectiveId", "userId", "collaboratorTypeId")
          WHERE "deletedAt" IS NULL;

          ALTER TABLE "GroupCollaborators" DROP CONSTRAINT IF EXISTS "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_";
          DROP INDEX IF EXISTS "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_";
          CREATE UNIQUE INDEX "GroupCollaborators_groupId_userId_collaboratorTypeId_active"
          ON "GroupCollaborators" ("groupId", "userId", "collaboratorTypeId")
          WHERE "deletedAt" IS NULL;
        `,
                { transaction }
            );
        }),

    down: async (queryInterface) =>
        queryInterface.sequelize.transaction(async (transaction) => {
            await prepMigration(queryInterface, transaction, __filename);

            await queryInterface.sequelize.query(
        /* sql */ `
          DROP INDEX IF EXISTS "GoalCollaborators_goalId_userId_collaboratorTypeId_active";
          CREATE UNIQUE INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_unique"
          ON "GoalCollaborators" ("goalId", "userId", "collaboratorTypeId", "deletedAt");
          ALTER TABLE "GoalCollaborators" ADD CONSTRAINT "GoalCollaborators_goalId_userId_collaboratorTypeId_unique"
          UNIQUE USING INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_unique";

          DROP INDEX IF EXISTS "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_act";
          CREATE UNIQUE INDEX "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un"
          ON "ObjectiveCollaborators" ("objectiveId", "userId", "collaboratorTypeId", "deletedAt");
          ALTER TABLE "ObjectiveCollaborators" ADD CONSTRAINT "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un"
          UNIQUE USING INDEX "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un";

          DROP INDEX IF EXISTS "GroupCollaborators_groupId_userId_collaboratorTypeId_active";
          CREATE UNIQUE INDEX "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_"
          ON "GroupCollaborators" ("groupId", "userId", "collaboratorTypeId", "deletedAt");
          ALTER TABLE "GroupCollaborators" ADD CONSTRAINT "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_"
          UNIQUE USING INDEX "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_";
        `,
                { transaction }
            );
        }),
};
