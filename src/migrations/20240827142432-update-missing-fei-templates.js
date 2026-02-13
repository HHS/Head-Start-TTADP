const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Goals"
        SET "goalTemplateId" = 19017
        WHERE "goalTemplateId" is null AND "id" IN (
          SELECT 
              g.id  
          FROM "Goals" g 
          INNER JOIN "GoalFieldResponses" gfr ON g.id = gfr."goalId"
          INNER JOIN "GoalTemplateFieldPrompts" gfft ON gfr."goalTemplateFieldPromptId" = gfft.id
          WHERE g."goalTemplateId" is null AND gfft."goalTemplateId" = 19017
        );

      `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
    }),
}
