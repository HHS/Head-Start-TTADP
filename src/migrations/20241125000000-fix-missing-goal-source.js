const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return queryInterface.sequelize.query(`
        -- This restores Goal.createdVia values that were not being set at creation time
        -- We considered also trying to restore Goal.source but decided that it it wasn't
        -- worth the ambiguity

        DROP TABLE IF EXISTS cv_modifications;
        CREATE TEMP TABLE cv_modifications AS
        SELECT
          g.id gid,
          CASE
            WHEN zd.descriptor IN ('createGoals','createGoalsFromTemplate') THEN 'rtr'::"enum_Goals_createdVia"
            WHEN zd.descriptor IN ('saveReport','createGoalsForReport') THEN 'activityReport'::"enum_Goals_createdVia"
          END new_created_via
        FROM "GoalTemplates" gt
        JOIN "Goals" g
          ON gt.id = g."goalTemplateId"
        JOIN "ZALGoals" zg
          ON g.id = zg.data_id
          AND zg.dml_type = 'INSERT'
        JOIN "ZADescriptor" zd
          ON zg.descriptor_id = zd.id
        WHERE gt."creationMethod" = 'Curated'
          AND g."createdAt" > '2024-10-31'
          AND g."createdVia" IS NULL
          AND zd.descriptor IN ('createGoals','saveReport','createGoalsForReport','createGoalsFromTemplate')
        ORDER BY 1;

        DROP TABLE IF EXISTS updated_goals;
        CREATE TEMP TABLE updated_goals
        AS
        WITH updater AS (
        UPDATE "Goals"
        SET "createdVia" = new_created_via
        FROM cv_modifications
        WHERE id = gid
          AND "createdVia" IS NULL -- just here for extra safety
        RETURNING id gid
        )
        SELECT * FROM updater
        ;

        -- These numbers should add up
        SELECT 'goals to be updated' item, COUNT(*) cnt FROM cv_modifications
        UNION
        SELECT
          'new rtr',
          COUNT(*)
        FROM "Goals"
        JOIN updated_goals
          ON id = gid
        WHERE "createdVia" = 'rtr'
        UNION
        SELECT
          'new activityReport',
          COUNT(*)
        FROM "Goals"
        JOIN updated_goals
          ON id = gid
        WHERE "createdVia" = 'activityReport'
        ORDER BY 1
        ;
      `)
    })
  },

  async down() {
    // no rollbacks
  },
}
