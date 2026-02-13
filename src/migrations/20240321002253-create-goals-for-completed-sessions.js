/* eslint-disable no-restricted-syntax */
const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      // Retrieve all completed sessions
      const [completedSessions] = await queryInterface.sequelize.query(
        `
      SELECT id, "eventId", data
      FROM "SessionReportPilots"
      WHERE data->>'status' = 'Complete';
      `,
        { transaction }
      )

      for await (const session of completedSessions) {
        const { recipients } = session.data

        for await (const recipient of recipients) {
          // Check if a Goal was already created for this grantId/eventId pair.
          const [[existingGoal]] = await queryInterface.sequelize.query(
            `SELECT * FROM "EventReportPilotGoals" erpg
              JOIN "Goals" g ON erpg."goalId" = g.id
              WHERE erpg."eventId" = '${session.eventId}'
                AND g."grantId" = '${recipient.value}'`,
            { transaction }
          )

          if (existingGoal) {
            // If we have an existing goal, make sure we have a record in EventReportPilotGoals.
            const [[existingEventReportPilotGoal]] = await queryInterface.sequelize.query(
              `SELECT * FROM "EventReportPilotGoals" WHERE "goalId" = ${existingGoal.id} AND "eventId" = '${session.eventId}' AND "sessionId" = ${session.id}`,
              { transaction }
            )

            if (!existingEventReportPilotGoal) {
              await queryInterface.sequelize.query(
                `INSERT INTO "EventReportPilotGoals" ("goalId", "eventId", "sessionId", "grantId", "createdAt", "updatedAt")
                VALUES (${existingGoal.id}, '${session.eventId}', ${session.id}, '${recipient.value}', NOW(), NOW());`,
                { transaction }
              )
            }
          }

          // If no existing Goal, create a new Goal and EventReportPilotGoal
          if (!existingGoal) {
            // Get the goal text from the data jsonb property on the EventReportPilot table
            // Use this goal text to create the new Goal.
            const [[eventReportPilot]] = await queryInterface.sequelize.query(
              `SELECT data, "pocIds" FROM "EventReportPilots" WHERE id = ${session.eventId}`,
              { transaction }
            )

            if (!eventReportPilot) {
              // eslint-disable-next-line no-continue
              continue
            }

            const { goal } = eventReportPilot.data

            const [[newGoal]] = await queryInterface.sequelize.query(
              `INSERT INTO "Goals" (name, "grantId", "createdAt", "updatedAt", status, "createdVia", source, "onAR", "onApprovedAR")
              VALUES ('${goal}', '${recipient.value}', NOW(), NOW(), 'In Progress', 'tr', 'Training event', true, true)
              RETURNING id;`,
              { transaction }
            )

            await queryInterface.sequelize.query(
              `INSERT INTO "EventReportPilotGoals" ("goalId", "eventId", "sessionId", "grantId", "createdAt", "updatedAt")
              VALUES (${newGoal.id}, '${session.eventId}', ${session.id}, '${recipient.value}', NOW(), NOW());`,
              { transaction }
            )

            const pocIds = eventReportPilot.pocIds || []

            const pocUsers = await queryInterface.sequelize.query(`SELECT id FROM "Users" WHERE id = ANY('{${pocIds.join(',')}}')`, { transaction })

            if (!pocUsers.length) {
              // eslint-disable-next-line no-continue
              continue
            }

            const [[pocUser]] = pocUsers

            await queryInterface.sequelize.query(
              `INSERT INTO "GoalCollaborators" ("collaboratorTypeId", "linkBack", "goalId", "userId", "createdAt", "updatedAt")
              VALUES (1, '${JSON.stringify({ sessionReportIds: [session.id] })}', ${newGoal.id}, ${pocUser.id}, NOW(), NOW());`,
              { transaction }
            )
          }
        }
      }
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
    }),
}
