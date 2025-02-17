/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Find duplicate GrantReplacementTypes, keeping the oldest
      const [duplicates] = await queryInterface.sequelize.query(
        `
          SELECT "name", array_agg(id ORDER BY "createdAt") AS ids
          FROM "GrantReplacementTypes"
          GROUP BY "name"
          HAVING COUNT(*) > 1
        `,
        { transaction },
      );

      // Resolve duplicates in GrantReplacementTypes
      for (const dup of duplicates) {
        const { ids } = dup;
        const [idToKeep, ...idsToRemove] = ids;

        // Update GrantReplacements to the idToKeep
        await queryInterface.sequelize.query(
          `
            UPDATE "GrantReplacements"
            SET "grantReplacementTypeId" = ${idToKeep}
            WHERE "grantReplacementTypeId" = ANY(array[${idsToRemove.join(',')}])
          `,
          { transaction },
        );

        // Delete duplicate ids from GrantReplacementTypes
        await queryInterface.sequelize.query(
          `
            DELETE FROM "GrantReplacementTypes"
            WHERE id = ANY(array[${idsToRemove.join(',')}])
          `,
          { transaction },
        );
      }

      // Remove exact duplicate GrantReplacements entries, keeping the oldest
      await queryInterface.sequelize.query(
        `
          DELETE FROM "GrantReplacements" gr
          USING (
            SELECT
              MIN(id) AS id,
              "replacedGrantId",
              "replacingGrantId",
              "grantReplacementTypeId"
            FROM "GrantReplacements"
            GROUP BY "replacedGrantId", "replacingGrantId", "grantReplacementTypeId"
            HAVING COUNT(*) > 1
          ) subquery
          WHERE gr."id" > subquery.id
          AND gr. "replacedGrantId" = subquery."replacedGrantId"
          AND gr. "replacingGrantId" = subquery."replacingGrantId"
          AND gr. "grantReplacementTypeId" = subquery."grantReplacementTypeId"
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {},
};
