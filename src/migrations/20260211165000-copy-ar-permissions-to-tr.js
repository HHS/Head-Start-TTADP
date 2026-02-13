const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      /**
       * READ_WRITE_REPORTS = 3
       * READ_WRITE_TRAINING_REPORTS = 7
       * POC_TRAINING_REPORTS = 9
       */

      // Copy AR permissions to TR permissions for all users with AR permissions
      await queryInterface.sequelize.query(`
        WITH ar_readwrite_users as (
            SELECT
                u.id user_id,
                p."regionId" region_id
            FROM "Users" u
            LEFT JOIN "Permissions" p ON u.id = p."userId"
            WHERE p."scopeId" = 3
            AND EXISTS (
                SELECT 1 FROM "Permissions" p2
                WHERE p2."userId" = u.id
                AND p2."scopeId" = 1
                AND p2."regionId" = 14
            )
        ) 
        INSERT INTO "Permissions" ("userId", "scopeId", "regionId", "createdAt", "updatedAt")
        SELECT user_id, 7, region_id, NOW(), NOW() FROM ar_readwrite_users
        UNION
        SELECT user_id, 9, region_id, NOW(), NOW() FROM ar_readwrite_users
        ON CONFLICT ("userId", "scopeId", "regionId") DO NOTHING;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    // no rollbacks here, would have to revert using audit log
  },
};
