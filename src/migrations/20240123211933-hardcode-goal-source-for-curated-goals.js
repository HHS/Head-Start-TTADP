const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      const FEI_GOAL =
        '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)'
      const MONITORING_GOAL = '(Monitoring) Grant recipient will improve teacher-child interactions (as measured by CLASS scores)'

      const FEI_SOURCE = 'Regional office priority'
      const MONITORING_SOURCE = 'Federal monitoring issues, including CLASS and RANs'

      await queryInterface.addColumn(
        'GoalTemplates',
        'source',
        {
          type: _Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
          UPDATE "GoalTemplates" SET "source" = '${FEI_SOURCE}'
            WHERE "templateName" ILIKE '${FEI_GOAL}' AND "creationMethod" = 'Curated';
          
          UPDATE "GoalTemplates" SET "source" = '${MONITORING_SOURCE}'
            WHERE "templateName" ILIKE '${MONITORING_GOAL}' AND "creationMethod" = 'Curated';

          UPDATE "Goals" SET "source" = '${FEI_SOURCE}' 
            WHERE "goalTemplateId" IN (
              SELECT "id" FROM "GoalTemplates" WHERE "templateName" ILIKE '${FEI_GOAL}' AND "creationMethod" = 'Curated'
            );
          
          UPDATE "Goals" SET "source" = '${MONITORING_SOURCE}' 
            WHERE "goalTemplateId" IN (
              SELECT "id" FROM "GoalTemplates" WHERE "templateName" ILIKE '${MONITORING_GOAL}' AND "creationMethod" = 'Curated'
            );
        `,
        { transaction }
      )
    })
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.removeColumn('GoalTemplates', 'source', { transaction })
    })
  },
}
