const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
      -- Create initial status changes for goals that don't have one
      WITH goals_without_initial_status AS (
        SELECT
          g.id AS goal_id,
          g.status,
          g."createdAt",
          gc."userId",
          u.name AS user_name
        FROM "Goals" g
        LEFT JOIN "GoalStatusChanges" gsc ON g.id = gsc."goalId" AND gsc."oldStatus" IS NULL
        LEFT JOIN "GoalCollaborators" gc ON g.id = gc."goalId"
        LEFT JOIN "CollaboratorTypes" ct ON gc."collaboratorTypeId" = ct.id
        LEFT JOIN "Users" u ON gc."userId" = u.id
        WHERE gsc.id IS NULL
        AND ct.name = 'Creator'
      )
      INSERT INTO "GoalStatusChanges" (
        "goalId",
        "userId",
        "userName",
        "oldStatus",
        "newStatus",
        "reason",
        "context",
        "createdAt",
        "updatedAt"
      )
      SELECT
        goal_id,
        "userId",
        user_name,
        NULL,
        status,
        'Goal created',
        'Creation',
        "createdAt",
        NOW()
      FROM goals_without_initial_status;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
      -- Remove the initial status change records
      DELETE FROM "GoalStatusChanges"
      WHERE "oldStatus" IS NULL
      AND "reason" = 'Goal created'
      AND "context" = 'Creation';
      `, { transaction });
    });
  },
};
