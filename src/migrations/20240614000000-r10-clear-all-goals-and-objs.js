const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`

      -- 1. Get all r10 goals that are currently visible.
      WITH r_10_active_goals AS (
      SELECT DISTINCT
        g.*
      FROM "Grants" gr
      JOIN "Goals" g
        ON gr.id = g."grantId"
      WHERE gr."regionId" = 10
        AND g.status != 'Closed'
        AND g."deletedAt" IS NULL
        AND g."mapsToParentGoalId" IS NULL
      ),
      -- 2. insert the status changes for the goals and return the important elements
      log_status_change AS (
      INSERT INTO "GoalStatusChanges"(
        "goalId",
        "userId",
        "userName",
        "userRoles",
        "oldStatus",
        "newStatus",
        "reason",
        "context",
        "createdAt",
        "updatedAt"
      )
      SELECT
        g.id "goalId",
        u.id,
        u.name,
        ARRAY_AGG(ro.name),
        g.status "oldSataus", 
        'Closed' "newStatus",
        'TTA completed' "reason",
        'Close all goals to move to new goal language' "context",
        now() "createdAt",
        now() "updatedAt"
      FROM r_10_active_goals g
      LEFT JOIN "Users" u
        ON (
          (u.id = 550 AND "phoneNumber" IS NOT NULL) --for non-prod
          OR
          (md5(u.name || 'bdjy34gg') = '7b1166c709d27ec6519b05c24373be6ai') --for prod
        )
      LEFT JOIN "UserRoles" ur
        ON u.id = ur."userId"
      LEFT JOIN "Roles" ro
        ON ur."roleId" = ro.id
      GROUP BY 1,2,3,5,6,7,8,9,10
      RETURNING
        id,
        "goalId",
        "newStatus",
        "updatedAt"
      ),
      -- 3. Update the actual goals
      update_goals AS (
      UPDATE "Goals" g
      SET
        "status" = lsc."newStatus",
        "updatedAt" = lsc."updatedAt"
      FROM log_status_change lsc
      WHERE g.id = lsc."goalId"
      RETURNING
        g.id "goalId",
        g.status
      ),
      -- 4. Update all objectives attached to any R10 goal
      update_objectives AS (
      UPDATE "Objectives" o
      SET
        "status" = 'Complete',
        "updatedAt" = NOW()
      FROM "Grants" gr
      JOIN "Goals" g
        ON g."grantId" = gr.id
        AND gr."regionId" = 10
      WHERE o."goalId" = g.id
        AND o."status" != 'Complete'
        AND o."deletedAt" IS NULL
        AND o."mapsToParentObjectiveId" IS NULL
      RETURNING
        o.id "objectiveId",
        o.status
      )
      -- 5. show stats for what was done when testing.
      SELECT
        'goals updated' stat,
        COUNT("goalId") statcnt
      FROM update_goals
      UNION
      SELECT
        'objectives updated',
        COUNT("objectiveId")
      FROM update_objectives;
        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // If we end up needing to revert this, it would be easier to use a separate
      // migration using the txid (or a similar identifier) after it's already set
    },
  ),
};
