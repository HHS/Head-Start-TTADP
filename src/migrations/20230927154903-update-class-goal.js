const { prepMigration } = require('../lib/migration')

const originalGoalName = '(PILOT) Grant recipient will improve teacher-child interactions (as measured by CLASS scores)'
const updatedGoalName = '(Monitoring) Grant recipient will improve teacher-child interactions (as measured by CLASS scores)'
const sharedGoalTemplateId = 18172

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
      -- update goal text for class goal
        UPDATE "Goals"
          SET
            "name" = '${updatedGoalName}',
            "goalTemplateId" = ${sharedGoalTemplateId}
          WHERE "name" = '${originalGoalName}';

      -- update activity report goals
        UPDATE "ActivityReportGoals"
          SET
            "name" = '${updatedGoalName}'
          WHERE "name" = '${originalGoalName}';
      
      -- set existing template to curated
      -- this will ensure the template always appears selectable (and read-only) in the UI
        UPDATE "GoalTemplates"
          SET
            "creationMethod" = 'Curated'::"enum_GoalTemplates_creationMethod",
            "templateName" = '${updatedGoalName}',
            "hash" = MD5(TRIM('${updatedGoalName}'))
          WHERE "id" = ${sharedGoalTemplateId};`,
        { transaction }
      )
    })
  },

  down: async () => {},
}
