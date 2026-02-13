const { prepMigration } = require('../lib/migration')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        `UPDATE "GoalTemplateFieldPrompts"
        SET "options" = '{"Community Partnerships",Facilities,"Family Circumstances","Other ECE Care Options", Unavailable, Workforce}'
        WHERE "title" = 'FEI root cause';`,
        { transaction }
      )
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Put back original options.
      await queryInterface.sequelize.query(
        `UPDATE "GoalTemplateFieldPrompts"
            SET "options" = '{"Community Partnerships",Facilities,"Family Circumstances","Other ECE Care Options", Workforce}'
            WHERE "title" = 'FEI root cause';`,
        { transaction }
      )
      // Put back original responses
      await queryInterface.sequelize.query(
        `
        UPDATE "GoalFieldResponses"
        SET "response" = array_remove("response", 'Unavailable')
        WHERE "goalTemplateFieldPromptId"
        IN (SELECT id FROM "GoalTemplateFieldPrompts" WHERE "title" = 'FEI root cause');
        `,
        { transaction }
      )
    })
  },
}
