const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        ` 
        INSERT INTO "Roles" ("name", "fullName", "isSpecialist", "createdAt", "updatedAt") VALUES ('RPD', 'Regional Program Director', false, now(), now());
      `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        `
        DELETE FROM "Roles" WHERE "name" = 'RPD';
      `,
        { transaction }
      )
    }),
}
