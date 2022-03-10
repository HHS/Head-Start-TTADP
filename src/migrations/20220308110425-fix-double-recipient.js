/* eslint-disable max-len */

module.exports = {
  up: async (queryInterface) => {

    return queryInterface.sequelize.transaction(async (transaction) => {
    /*
      * Temporary recipient merge after a better solution is found.
      * Ideally, this would be fixed in HSES (TTAHUB-705).
      * Folds grant with an id 9957 under recipient 7782.
      * Deletes recipient 5.
      */
      await queryInterface.sequelize.query('UPDATE "Grants" SET "recipientId" = 7782 WHERE "id" = 9957;', { transaction });
      await queryInterface.sequelize.query('UPDATE "GrantGoals" SET "recipientId" = 7782 WHERE "id" = 9957;', { transaction });
      await queryInterface.sequelize.query('DELETE FROM "Recipients" WHERE "id" = 5;', { transaction });
    });
  },

  down: async (queryInterface) => {

    return queryInterface.sequelize.transaction(async (transaction) => {
    /*
      * Undo the above actions.
      */

    const query = `INSERT INTO "Recipients"(id, "name", "createdAt", "updatedAt", "recipientType") VALUES (5, 'Arkansas Department of Human Services', '2021-03-16T01:34:16.558Z', '2021-03-16T01:34:16.558Z', 'Government Agency (Non-CAA)');`

    await queryInterface.sequelize.query(query, { transaction });
    await queryInterface.sequelize.query('UPDATE "Grants" SET "recipientId" = 5 WHERE "id" = 9957;', { transaction });
    await queryInterface.sequelize.query('UPDATE "GrantGoals" SET "recipientId" = 5 WHERE "id" = 9957;', { transaction });
    });
  },
};