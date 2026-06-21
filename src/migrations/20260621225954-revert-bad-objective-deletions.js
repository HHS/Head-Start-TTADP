const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
        UPDATE "Objectives"
        SET "deletedAt" = NULL
         WHERE id IN (
          SELECT o.id FROM "Objectives" o
            INNER JOIN "Goals" g ON o."goalId" = g.id
            INNER JOIN "GoalTemplates" gt ON g."goalTemplateId" = gt.id
            INNER JOIN "ActivityReportObjectives" aro ON aro."objectiveId" = o.id
            INNER JOIN "ActivityReports" ar ON ar.id = aro."activityReportId"
                WHERE gt."standard" IS NOT NULL
                AND g."createdAt" >= '2025-09-01'
                AND g."deletedAt" IS NULL
                AND o."deletedAt" IS NOT NULL
                AND ar."calculatedStatus" != 'deleted'
          );
        
        `,
        { transaction }
      );
    });
  },

  async down() {
    // This cannot be sensibly rolled bacl
  },
};
