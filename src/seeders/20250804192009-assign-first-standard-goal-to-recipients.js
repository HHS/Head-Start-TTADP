// this seed assigns the first curated goal template (fei) as a new 'not started' goal
// to one active grant for each recipient found in the initial seeds.
// it also assigns user 1 ('hermione granger') as the 'creator' collaborator.
// this ensures each recipient has one standard goal visible on the rtr after seeding.

const { GOAL_STATUS } = require('../constants')

// these ids were looked up once from the db when writing this seed
// hardcoding them makes the seed run faster and avoids complex queries
const recipientsGrants = [
  { recipientId: 11, grantId: 12 },
  { recipientId: 8, grantId: 9 },
  { recipientId: 9, grantId: 10 },
  { recipientId: 7, grantId: 8 },
  { recipientId: 1, grantId: 1 },
  { recipientId: 4, grantId: 15 },
  { recipientId: 2, grantId: 16 },
  { recipientId: 6, grantId: 13 },
  { recipientId: 55, grantId: 14 },
  { recipientId: 3, grantId: 3 },
]
const firstTemplate = {
  templateId: 1,
  templateName:
    '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)',
}
const creatorTypeId = 1
const creatorUserId = 1 // Hermione Granger

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction()
    try {
      const now = new Date()

      // prepare goal data
      const goalsToCreate = recipientsGrants.map(({ grantId }) => ({
        grantId,
        goalTemplateId: firstTemplate.templateId,
        name: firstTemplate.templateName,
        status: GOAL_STATUS.NOT_STARTED,
        createdVia: 'admin', // see GOAL_CREATED_VIA in src/constants.js
        createdAt: now,
        updatedAt: now,
        onAR: false,
        onApprovedAR: false,
      }))

      // bulk insert goals
      const createdGoals = await queryInterface.bulkInsert('Goals', goalsToCreate, {
        transaction,
        returning: ['id', 'grantId'], // request ids back
      })

      // ensure we got ids back (adjust if bulkinsert behaves differently)
      if (!createdGoals || createdGoals.length !== goalsToCreate.length || !createdGoals[0].id) {
        // fallback: query the ids if returning didn't work as expected
        const goalIds = await queryInterface.sequelize.query(
          `SELECT id, "grantId" FROM "Goals" WHERE "goalTemplateId" = ${firstTemplate.templateId} AND "createdVia" = 'admin'`,
          { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
        )

        if (!goalIds || goalIds.length !== goalsToCreate.length) {
          throw new Error('failed to retrieve IDs of created goals.')
        }

        throw new Error('bulkInsert did not return IDs as expected')
      }

      // prepare goalcollaborator data
      const collaboratorsToCreate = createdGoals.map((goal) => ({
        goalId: goal.id,
        userId: creatorUserId,
        collaboratorTypeId: creatorTypeId,
        createdAt: now,
        updatedAt: now,
      }))

      // bulk insert goalcollaborators
      await queryInterface.bulkInsert('GoalCollaborators', collaboratorsToCreate, { transaction })

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      // eslint-disable-next-line no-console
      console.error('Error seeding standard goals for recipients:', error)
      throw error
    }
  },

  down: async (queryInterface) => {
    // remove the collaborators and goals created by this seed
    const transaction = await queryInterface.sequelize.transaction()
    try {
      // find the goals created by this seed
      const goals = await queryInterface.sequelize.query(
        `SELECT id FROM "Goals" WHERE "goalTemplateId" = ${firstTemplate.templateId} AND "createdVia" = 'admin'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      )

      const goalIds = goals.map((g) => g.id)

      if (goalIds.length > 0) {
        // delete goalcollaborators first due to foreign key constraints
        await queryInterface.bulkDelete(
          'GoalCollaborators',
          {
            goalId: goalIds,
            userId: creatorUserId,
            collaboratorTypeId: creatorTypeId,
          },
          { transaction }
        )

        // delete goals
        await queryInterface.bulkDelete(
          'Goals',
          {
            id: goalIds,
          },
          { transaction }
        )
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      // eslint-disable-next-line no-console
      console.error('Error reverting standard goal seed:', error)
      throw error
    }
  },
}
