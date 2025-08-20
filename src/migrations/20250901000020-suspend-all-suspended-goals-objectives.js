const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`        
        WITH latest_gsc AS (
          SELECT DISTINCT ON (gsc."goalId") 
            gsc."goalId",
            gsc.reason
          FROM "GoalStatusChanges" gsc
          INNER JOIN "Goals" g ON g.id = gsc."goalId"
          WHERE gsc."newStatus" = 'Suspended'
          AND g.status = 'Suspended'
          ORDER BY gsc."goalId", gsc."createdAt" DESC
        )
        UPDATE "Objectives" 
          SET "status" = 'Suspended',
              "closeSuspendReason" = CASE 
                WHEN latest_gsc.reason IN ('Duplicate goal', 'Key staff turnover / vacancies', 'Recipient is not responding', 'Recipient request', 'Regional Office request', 'TTA complete')
                THEN latest_gsc.reason::"enum_Objectives_suspendReason"
                ELSE NULL
              END
          FROM latest_gsc
          WHERE "Objectives".status IN ('Not Started', 'In Progress')
          AND "Objectives"."goalId" = latest_gsc."goalId"
        ;
    `, { transaction });
    });
  },

  async down(queryInterface) {
    // can't be reverted
  },
};
