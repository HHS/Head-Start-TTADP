const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // adding the distinct_cte layer to 
      await queryInterface.sequelize.query(/* sql */`
        DROP MATERIALIZED VIEW IF EXISTS public."GrantRelationshipToActive";

        CREATE MATERIALIZED VIEW IF NOT EXISTS public."GrantRelationshipToActive"
        AS
        WITH
          RECURSIVE recursive_cte AS (
            SELECT g.id AS "grantId",
                g.id AS "activeGrantId",
                ARRAY[g.id] AS "visited_grantIds"
              FROM "Grants" g
              WHERE g.status::text = 'Active'::text
            UNION ALL
            SELECT g.id AS "grantId",
                NULL::integer AS "activeGrantId",
                ARRAY[g.id] AS "visited_grantIds"
              FROM "Grants" g
                JOIN "GrantReplacements" gr1 ON g.id = gr1."replacingGrantId"
                LEFT JOIN "GrantReplacements" gr2 ON g.id = gr2."replacedGrantId"
              WHERE g.status::text <> 'Active'::text AND gr2.id IS NULL
            UNION ALL
            SELECT g.id AS "grantId",
                NULL::integer AS "activeGrantId",
                ARRAY[g.id] AS "visited_grantIds"
              FROM "Grants" g
                JOIN "GrantReplacements" gr ON g.id = gr."replacingGrantId" OR g.id = gr."replacedGrantId"
              WHERE g.status::text <> 'Active'::text AND gr.id IS NULL
            UNION ALL
            SELECT g.id AS "grantId",
                rcte_1."activeGrantId",
                rcte_1."visited_grantIds" || g.id
              FROM recursive_cte rcte_1
                JOIN "GrantReplacements" gr ON rcte_1."grantId" = gr."replacingGrantId"
                JOIN "Grants" g ON g.id = gr."replacedGrantId"
              WHERE g.id <> ALL (rcte_1."visited_grantIds")
            ),
            distinct_cte AS (
              SELECT DISTINCT *
              FROM recursive_cte
            )
        SELECT DISTINCT 
          row_number() OVER (ORDER BY dcte."grantId", dcte."activeGrantId") AS id,
          dcte."grantId",
          dcte."activeGrantId"
        FROM distinct_cte dcte
        ORDER BY 2,3
        WITH DATA;

        ALTER TABLE IF EXISTS public."GrantRelationshipToActive"
          OWNER TO postgres;


        CREATE INDEX "idx_GrantRelationshipToActive_grantId_activeGrantId"
          ON public."GrantRelationshipToActive" USING btree
          ("grantId", "activeGrantId");
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};