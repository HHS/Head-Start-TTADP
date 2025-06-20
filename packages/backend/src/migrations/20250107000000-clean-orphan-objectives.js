const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        -- This marks as deleted any objectives for which all of the following are true:
        -- - created within an AR
        -- - Is currently linked to no AR
        -- - Is not already marked as deleted

        DROP TABLE IF EXISTS orphan_obj;
        CREATE TEMP TABLE orphan_obj AS
        SELECT o.id oid
        FROM "Objectives" o
        LEFT JOIN "ActivityReportObjectives" aro
          ON o.id = aro."objectiveId"
        WHERE o."createdVia" = 'activityReport'
          AND o."deletedAt" IS NULL
          AND aro.id IS NULL
        ORDER BY 1;

        DROP TABLE IF EXISTS updated_obj;
        CREATE TEMP TABLE updated_obj
        AS
        WITH nowtime AS (SELECT NOW() nowts)
        , updater AS (
        UPDATE "Objectives"
        SET "deletedAt" = nowts
        FROM orphan_obj
        CROSS JOIN nowtime
        WHERE oid = id
        RETURNING id deleted_oid
        )
        SELECT * FROM updater
        ;

        -- The first two numbers should match and the last should be 0
        SELECT 1 ord,'orphaned objectives' item, COUNT(*) cnt FROM orphan_obj
        UNION
        SELECT 2, 'objectives marked deleted' , COUNT(*)  FROM updated_obj
        UNION
        SELECT 3, 'remaining orphaned objectives', COUNT(*) FROM (
          SELECT * FROM orphan_obj
          EXCEPT
          SELECT * FROM updated_obj
        ) a
        ORDER BY 1
        ;
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
