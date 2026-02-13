/* eslint-disable no-tabs */
const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      // Change the userName column of GoalStatusChanges to allow null.
      await queryInterface.changeColumn(
        'GoalStatusChanges',
        'userName',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      )
      await queryInterface.changeColumn(
        'GoalStatusChanges',
        'userRoles',
        {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true,
        },
        { transaction }
      )
      await queryInterface.changeColumn(
        'GoalStatusChanges',
        'reason',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      )
      await queryInterface.changeColumn(
        'GoalStatusChanges',
        'newStatus',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      )
      await queryInterface.changeColumn(
        'GoalStatusChanges',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
select create_timeseries_from_audit_log('Users');
select create_timeseries_from_audit_log('UserRoles');

WITH
  reason_lookup AS (
    SELECT *
    FROM
      (VALUES
        ('Not Started', 'In Progress', 'reviewReport', 'UPDATE', 'Activity Report reviewed', NULL),
        ('Draft', 'Not Started', 'submitReport', 'UPDATE', 'Activity Report submission', NULL),
        (NULL, 'Draft', 'createGoalsForReport', 'INSERT', 'Activity Report created', NULL),
        ('Not Started', 'In Progress', NULL, 'UPDATE', 'Objective moved to In Progress', NULL),
        (NULL, 'Not Started', NULL, 'INSERT', NULL, NULL),
        (NULL, 'Draft', 'saveReport', 'INSERT', 'Activity Report created', NULL),
        (NULL, 'In Progress', 'createGoalsForReport', 'INSERT', 'Activity Report created', NULL),
        ('Not Started', 'Draft', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        (NULL, 'Draft', NULL, 'INSERT', NULL, NULL),
        ('Draft', 'Not Started', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        (NULL, 'In Progress', NULL, 'INSERT', NULL, NULL),
        ('Closed', NULL, 'dup_goals_Delete_Goals', 'DELETE', 'Migration', NULL),
        (NULL, 'Not Started', 'createGoalsForReport', 'INSERT', 'Activity Report created', NULL),
        ('Draft', 'Not Started', NULL, 'UPDATE', NULL, NULL),
        ('In Progress', 'Draft', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        (NULL, 'In Progress', 'saveReport', 'INSERT', 'User change', NULL),
        ('Not Started', 'In Progress', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        ('Draft', 'In Progress', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        ('In Progress', NULL, 'dup_goals_Delete_Goals', 'DELETE', 'Migration', NULL),
        ('In Progress', 'Not Started', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        ('In Progress', 'Not Started', 'saveReport', 'UPDATE', 'User change', NULL),
        ('Not Started', 'In Progress', 'saveReport', 'UPDATE', 'User change', NULL),
        ('Not Started', 'Draft', 'saveReport', 'UPDATE', 'User change', NULL),
        (NULL, 'Not Started', 'saveReport', 'INSERT', 'User change', NULL),
        ('Draft', 'In Progress', 'saveReport', 'UPDATE', 'User change', NULL),
        ('In Progress', 'Closed', NULL, 'UPDATE', NULL, NULL),
        ('In Progress', 'Draft', 'saveReport', 'UPDATE', 'User change', NULL),
        (NULL, 'Draft', 'createGoals', 'INSERT', 'Goal creation', NULL),
        ('Not Started', NULL, 'RUN MIGRATIONS', 'DELETE', 'Migration', NULL),
        ('Draft', 'Not Started', 'createGoals', 'UPDATE', 'Goal creation', NULL),
        ('Draft', NULL, 'RUN MIGRATIONS', 'DELETE', 'Migration', NULL),
        ('Draft', NULL, 'createGoalsForReport', 'DELETE', 'Activity Report created', NULL),
        ('Closed', NULL, 'RUN MIGRATIONS', 'DELETE', 'Migration', NULL),
        ('Draft', 'Not Started', 'saveReport', 'UPDATE', 'User change', NULL),
        ('Closed', 'In Progress', 'mergeGoalHandler', 'UPDATE', NULL, NULL),
        ('Draft', NULL, 'saveReport', 'DELETE', 'User change', NULL),
        ('Draft', 'In Progress', 'reviewReport', 'UPDATE', 'Activity Report reviewed', NULL),
        (NULL, 'In Progress', 'mergeGoalHandler', 'INSERT', NULL, NULL),
        ('Not Started', 'Closed', NULL, 'UPDATE', 'Migration', NULL),
        ('In Progress', 'Closed', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        ('In Progress', 'Closed', 'saveReport', 'UPDATE', 'User change', NULL),
        ('In Progress', NULL, 'RUN MIGRATIONS', 'DELETE', 'Migration', NULL),
        (NULL, 'Closed', 'saveReport', 'INSERT', 'User change', NULL),
        (NULL, 'Closed', 'createGoalsForReport', 'INSERT', 'Activity Report created', NULL),
        ('Closed', 'In Progress', 'createGoalsForReport', 'UPDATE', 'Activity Report created', NULL),
        (NULL, 'Closed', NULL, 'INSERT', 'Migration', NULL),
        ('In Progress', 'Not Started', NULL, 'UPDATE', NULL, NULL),
        ('Not Started', NULL, 'saveReport', 'DELETE', 'User change', NULL),
        ('Closed', 'In Progress', 'saveReport', 'UPDATE', 'User change', NULL),
        (NULL, 'Draft', 'updateHandler', 'INSERT', NULL, NULL),
        (NULL, 'In Progress', 'RUN MIGRATIONS', 'INSERT', 'Migration', NULL),
        (NULL, 'Closed', 'mergeGoalHandler', 'INSERT', NULL, NULL),
        ('In Progress', NULL, 'createGoalsForReport', 'DELETE', 'Activity Report created', NULL),
        ('Not Started', 'Suspended', NULL, 'UPDATE', 'Migration', NULL),
        ('In Progress', NULL, 'saveReport', 'DELETE', 'User change', NULL),
        ('In Progress', 'Closed', 'changeGoalStatus', 'UPDATE', NULL, NULL),
        ('Not Started', NULL, 'dup_goals_Delete_Goals', 'DELETE', 'Migration', NULL),
        (NULL, 'Not Started', 'createGoalsFromAdmin', 'INSERT', NULL, NULL),
        ('Not Started', NULL, NULL, 'DELETE', NULL, NULL),
        ('Not Started', NULL, 'createGoalsForReport', 'DELETE', 'Activity Report created', NULL),
        ('Draft', 'In Progress', 'updateHandler', 'UPDATE', NULL, NULL),
        ('Not Started', 'In Progress', 'dup_goals_Update_Goals', 'UPDATE', 'Migration', NULL),
        ('Suspended', 'In Progress', 'changeGoalStatus', 'UPDATE', NULL, NULL),
        ('Closed', 'In Progress', 'reviewReport', 'UPDATE', 'Activity Report reviewed', NULL),
        ('Draft', 'In Progress', NULL, 'UPDATE', NULL, NULL),
        ('Closed', 'In Progress', NULL, 'UPDATE', NULL, NULL),
        (NULL, 'Draft', 'RUN MIGRATIONS', 'UPDATE', NULL, NULL),
        ('Suspended', 'Closed', NULL, 'UPDATE', NULL, NULL),
        ('In Progress', 'Suspended', NULL, 'UPDATE', 'Migration', NULL),
        ('Not Started', 'In Progress', 'createGoals', 'UPDATE', 'Goal creation', NULL),
        ('Draft', NULL, NULL, 'DELETE', NULL, NULL),
        ('Suspended', 'Closed', 'changeGoalStatus', 'UPDATE', NULL, NULL),
        (NULL, 'Not Started', 'RUN MIGRATIONS', 'UPDATE', NULL, NULL),
        ('Not Started', 'In Progress', 'changeGoalStatus', 'UPDATE', NULL, NULL),
        (NULL, 'In Progress', 'updateHandler', 'INSERT', NULL, NULL),
        ('Closed', 'In Progress', 'RUN MIGRATIONS', 'UPDATE', 'Migration', NULL),
        ('Suspended', 'In Progress', NULL, 'UPDATE', NULL, NULL),
        ('Suspended', 'Not Started', 'changeGoalStatus', 'UPDATE', NULL, NULL),
        ('In Progress', NULL, NULL, 'DELETE', NULL, NULL),
        ('Suspended', NULL, 'dup_goals_Delete_Goals', 'DELETE', 'Migration', NULL),
        (NULL, 'Suspended', NULL, 'INSERT', 'Migration', NULL),
        ('Closed', NULL, 'saveReport', 'DELETE', 'User change', NULL),
        (NULL, 'Not Started', 'mergeGoalHandler', 'INSERT', NULL, NULL),
        ('Draft', 'In Progress', 'dup_goals_Update_Goals', 'UPDATE', 'Migration', NULL),
        (NULL, 'Completed', NULL, 'INSERT', 'Migration', NULL),
        (NULL, 'Suspended', 'mergeGoalHandler', 'INSERT', NULL, NULL),
        (NULL, 'Ceased/Suspended', NULL, 'INSERT', 'Migration', NULL),
        ('Suspended', 'Not Started', NULL, 'UPDATE', NULL, NULL),
        ('Not Started', 'In Progress', 'submitReport', 'UPDATE', NULL, NULL),
        ('Draft', NULL, 'dup_goals_Delete_Goals', 'DELETE', 'Migration', NULL),
        ('Closed', 'In Progress', 'unlockReport', 'UPDATE', NULL, NULL),
        ('Suspended', 'In Progress', 'mergeGoalHandler', 'UPDATE', NULL, NULL),
        ('Suspended', 'Draft', 'saveReport', 'UPDATE', 'User change', NULL),
        ('Suspended', 'In Progress', 'reviewReport', 'UPDATE', 'Activity Report reviewed', NULL),
        ('Suspended', 'Draft', 'createGoalsForReport', 'UPDATE', NULL, NULL),
        ('Closed', 'Not Started', NULL, 'UPDATE', NULL, NULL),
        ('Not Started', 'Draft', 'createGoals', 'UPDATE', 'Goal creation', NULL),
        ('In Progress', 'Closed', 'dup_goals_Update_Goals', 'UPDATE', 'Migration', NULL),
        (NULL, 'Draft', NULL, 'UPDATE', NULL, NULL),
        ('Not Started', 'In Progress', 'mergeGoalHandler', 'UPDATE', NULL, NULL),
        ('In Progress', 'Suspended', 'dup_goals_Update_Goals', 'UPDATE', 'Migration', NULL),
        ('In Progress', 'Not Started', 'RUN MIGRATIONS', 'UPDATE', 'Migration', NULL),
        ('Draft', NULL, 'deleteGoal', 'DELETE', NULL, NULL),
        ('In Progress', 'Draft', NULL, 'UPDATE', NULL, NULL),
        ('Closed', NULL, 'createGoalsForReport', 'DELETE', NULL, NULL),
        ('In Progress', 'Draft', 'createGoals', 'UPDATE', 'Goal creation', NULL),
        (NULL, 'In Progress', NULL, 'UPDATE', NULL, NULL),
        ('Suspended', 'In Progress', 'createGoals', 'UPDATE', 'Goal creation', NULL),
        ('Draft', 'In Progress', 'createGoals', 'UPDATE', 'Goal creation', NULL),
        ('Not Started', 'Draft', NULL, 'UPDATE', NULL, NULL),
        ('Suspended', 'In Progress', 'createGoalsForReport', 'UPDATE', NULL, NULL)
      ) AS tmp_data("oldStatus", "newStatus", descriptor, dml_type, reason, context)
  ),
    status_changes_query AS (
        SELECT
            zg.data_id AS "goalId",
            CASE
                WHEN zg.dml_as = -1 OR zg.dml_as = 0 THEN NULL
                ELSE zg.dml_as
            END AS "userId",
            u.name AS "userName",
            ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) AS "userRoles",
            zg.old_row_data ->> 'status' AS "oldStatus",
            zg.new_row_data ->> 'status' AS "newStatus",
            COALESCE((ARRAY_AGG(TRIM(NULLIF(zg.new_row_data ->> 'closeSuspendReason', ''))))[1], rl.reason) AS "reason",
            COALESCE((ARRAY_AGG(TRIM(NULLIF(zg.new_row_data ->> 'closeSuspendContext', ''))))[1], rl.context) AS "context",
            zg.dml_timestamp AS "createdAt",
            zg.dml_timestamp AS "updatedAt"
        FROM
            "ZALGoals" zg
        LEFT JOIN "ZADescriptor" zd ON zg.descriptor_id = zd.id
        LEFT JOIN "Users_timeseries" u ON zg."dml_as" = u.data_id AND zg.dml_timestamp BETWEEN u.timeband_start AND u.timeband_end
        LEFT JOIN "UserRoles_timeseries" ur ON zg."dml_as" = ur."userId" AND zg.dml_timestamp BETWEEN ur.timeband_start AND ur.timeband_end
        LEFT JOIN "Roles" r ON ur."roleId" = r.id
        LEFT JOIN reason_lookup rl
            ON (zg.old_row_data ->> 'status' = rl."oldStatus")
            AND (zg.new_row_data ->> 'status' = rl."newStatus")
            AND (zd.descriptor = rl.descriptor)
            AND (zg.dml_type::text = rl.dml_type)
        WHERE
            (NULLIF(TRIM(zg.old_row_data ->> 'status'), '') IS NOT NULL
                OR NULLIF(TRIM(zg.new_row_data ->> 'status'), '') IS NOT NULL)
        GROUP BY
            zg.data_id,
            zg.dml_as,
            u.name,
            zg.dml_timestamp,
            rl.reason,
            rl.context,
            zg.old_row_data ->> 'status',
            zg.new_row_data ->> 'status'
    )
INSERT INTO "GoalStatusChanges"
      ("goalId", "userId", "userName", "userRoles", "oldStatus", "newStatus", "reason", "context", "createdAt", "updatedAt")
    SELECT
        scq."goalId", scq."userId", scq."userName", scq."userRoles", scq."oldStatus", scq."newStatus", scq."reason", scq."context", scq."createdAt", scq."updatedAt"
    FROM status_changes_query scq
    LEFT JOIN "GoalStatusChanges" gsc
    ON gsc."goalId" = scq."goalId"
    AND gsc."oldStatus" = scq."oldStatus"
    AND gsc."newStatus" = scq."newStatus"
    AND gsc."createdAt" BETWEEN scq."createdAt" - interval '30 seconds' AND scq."createdAt" + interval '30 seconds'
    LEFT JOIN "Goals" g ON g.id = scq."goalId"
    WHERE gsc.id IS NULL
    AND g.id IS NOT NULL;
      `,
        { transaction }
      )
    }),

  down: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async () => {
      // Change the userName column of GoalStatusChanges to not allow null.
      await queryInterface.changeColumn('GoalStatusChanges', 'userName', {
        type: Sequelize.STRING,
        allowNull: false,
      })
    }),
}
