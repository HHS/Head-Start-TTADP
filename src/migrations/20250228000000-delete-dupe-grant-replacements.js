const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return queryInterface.sequelize.query(`
        -- There are some old GrantReplacements records with null
        -- grantReplacementTypeId values that are followed by another
        -- GrantReplacements record that is the same except the
        -- grantReplacementTypeId values are set. This removes the
        -- null grantReplacementTypeId value set.

        -- There are also many other GrantReplacements entries where
        -- they have the same replacedGrantId and replacingGrantId, but
        -- different non-null grantReplacementTypeId values.
        -- This leaves those intact because they are of potential
        -- future interest.

        -- Find the dupe sets but only choose those with at least one record
        -- where "grantReplacementTypeId" IS NULL and at least one record is
        -- NOT null.
        DROP TABLE IF EXISTS dupe_grant_replacement_sets;
        CREATE TEMP TABLE dupe_grant_replacement_sets
        AS
        SELECT
          "replacedGrantId" old_grid,
          "replacingGrantId" new_grid,
          COUNT(id) FILTER (WHERE "grantReplacementTypeId" IS NULL) nullid_cnt,
          COUNT(id) cnt
        FROM "GrantReplacements" gr
        GROUP BY 1,2
        HAVING BOOL_OR("grantReplacementTypeId" IS NULL)
          AND BOOL_OR("grantReplacementTypeId" IS NOT NULL)
        ;

        -- delete the dupes with null grantReplacementTypeId
        DROP TABLE IF EXISTS deleted_gr_dupes;
        CREATE TEMP TABLE deleted_gr_dupes
        AS
        WITH updater AS (
        DELETE FROM "GrantReplacements"
        USING dupe_grant_replacement_sets
        WHERE "replacedGrantId" = old_grid
          AND "replacingGrantId" = new_grid
          AND "grantReplacementTypeId" IS NULL
        RETURNING id deleted_grid
        )
        SELECT * FROM updater
        ;

        -- These should match
        SELECT 1 ord,'dupes to delete' item, SUM(nullid_cnt) cnt FROM dupe_grant_replacement_sets
        UNION
        SELECT 2, 'dupes deleted' , COUNT(*)  FROM deleted_gr_dupes
        ORDER BY 1
        ;
      `)
    })
  },

  async down() {
    // no rollbacks
  },
}
