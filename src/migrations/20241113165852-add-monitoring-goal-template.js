const { prepMigration } = require('../lib/migration')

const goalText = '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.'
module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      // Add monitor goal template.
      await queryInterface.sequelize.query(
        `INSERT INTO "GoalTemplates" (
          hash,
          "templateName",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateNameModifiedAt"
        ) Values (
          MD5(TRIM('${goalText}')),
          '${goalText}',
          null,
          'Curated'::"enum_GoalTemplates_creationMethod",
          current_timestamp,
          current_timestamp,
          NULL,
          current_timestamp
        );`,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        `DELETE FROM "GoalTemplates"
        WHERE hash = MD5(TRIM('${goalText}'))
        AND "creationMethod" = 'Curated'::"enum_GoalTemplates_creationMethod";
        `,
        { transaction }
      )
    }),
}
