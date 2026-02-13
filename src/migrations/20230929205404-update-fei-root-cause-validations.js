const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
      UPDATE "GoalTemplateFieldPrompts"
        SET "validations" = '{"required":"Select a root cause","rules":[{"name":"maxSelections","value":2,"message":"You can only select 2 options"},{"name":"minSelections","value":1,"message":"You must select at least one options"}]}'
      WHERE "title" = 'FEI root cause'
      `,
        { transaction }
      )
    })
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        `
        UPDATE "GoalTemplateFieldPrompts"
          SET "validations" = '{"required":"Select a root cause","rules":[{"name":"maxSelections","value":2,"message":"You can only select 2 options"}]}'
        WHERE "title" = 'FEI root cause'
        `,
        { transaction }
      )
    })
  },
}
