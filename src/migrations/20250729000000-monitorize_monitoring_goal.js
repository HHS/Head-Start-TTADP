const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- Fully 'monitorizes' the monitoring goal.
        UPDATE "Goals" g
        SET
          name = "templateName",
          "createdVia" = 'monitoring',
          "goalTemplateId" = 24872,
          "deletedAt" = NULL
        FROM "GoalTemplates" gt
        WHERE g.id = 102169
          AND g."grantId" = 12174
          AND gt.id =  24872
          AND gt.standard = 'Monitoring';
    `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Goals"
        SET
          "createdVia" = 'activityReport',
          "deletedAt" = now()
        WHERE id = 102169
          AND "grantId" = 12174;
    `,
        { transaction }
      )
    })
  },
}
