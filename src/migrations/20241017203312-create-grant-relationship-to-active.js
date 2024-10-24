const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(/* sql */`
        CREATE MATERIALIZED VIEW "GrantRelationshipToActive" AS
        WITH RECURSIVE recursive_cte AS (
            -- Base query: Case 1: Select all Active grants from the "Grants" table
            SELECT
                g."id" AS "grantId",
                g."id" AS "activeGrantId",
                ARRAY[g."id"] AS "visited_grantIds"  -- Initialize the array with the first grantId
            FROM "Grants" g
            WHERE g."status" = 'Active'

            UNION ALL

            -- Base query: Case 2: Select all inactive grants from the "Grants" table that have replaced other grants, but that have not been replaced
            SELECT
                g."id" AS "grantId",
                NULL::int AS "activeGrantId",
                ARRAY[g."id"] AS "visited_grantIds"  -- Initialize the array with the first grantId
            FROM "Grants" g
            JOIN "GrantReplacements" gr1
            ON g.id = gr1."replacingGrantId"
            LEFT JOIN "GrantReplacements" gr2
            ON g.id = gr2."replacedGrantId"
            WHERE g.status != 'Active'
            AND gr2.id IS NULL

            UNION ALL

            -- Base query: Case 3: Select all inactive grants from the "Grants" table that have never replaced other grants or been replaced
            SELECT
                g."id" AS "grantId",
                NULL::int AS "activeGrantId",
                ARRAY[g."id"] AS "visited_grantIds"  -- Initialize the array with the first grantId
            FROM "Grants" g
            JOIN "GrantReplacements" gr
            ON g.id = gr."replacingGrantId"
            OR g.id = gr."replacedGrantId"
            WHERE g.status != 'Active'
            AND gr.id IS NULL

            UNION ALL

            -- Recursive query: Use an array to track visited grantIds
            SELECT
                g."id" AS "grantId",
                rcte."activeGrantId",
                "visited_grantIds" || g."id"  -- Append the current grantId to the array
            FROM recursive_cte rcte
            JOIN "GrantReplacements" gr
            ON rcte."grantId" = gr."replacingGrantId"
            JOIN "Grants" g
            ON g."id" = gr."replacedGrantId"
            WHERE g."id" != ALL("visited_grantIds")  -- Ensure the current grantId hasn't been visited
        )
        SELECT DISTINCT
            ROW_NUMBER() OVER (ORDER BY rcte."grantId", rcte."activeGrantId") AS "id",  -- Add row number as "id"
            rcte."grantId",
            rcte."activeGrantId"
        FROM recursive_cte rcte
        WITH NO DATA;
      `, { transaction });

      await queryInterface.sequelize.query(/* sql */`
        CREATE INDEX "idx_GrantRelationshipToActive_grantId_activeGrantId"
        ON "GrantRelationshipToActive" ("grantId", "activeGrantId");
      `, { transaction });

      // Initial refresh without CONCURRENTLY to populate the materialized view
      await queryInterface.sequelize.query(/* sql */`
        REFRESH MATERIALIZED VIEW "GrantRelationshipToActive";
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(/* sql */`
        DROP MATERIALIZED VIEW IF EXISTS "GrantRelationshipToActive";
      `, { transaction });
    },
  ),
};
