import faker from '@faker-js/faker'
import goalsFromTemplate from './goalsFromTemplate'
import { Goal, Grant, GoalTemplate, Recipient, sequelize } from '../models'
import { GOAL_STATUS } from '../constants'
import { createGoal, createGoalTemplate, createGrant, createRecipient } from '../testUtils'

describe('goalsFromTemplate', () => {
  let recipient
  let grant
  let secondGrant
  let thirdGrant
  let goalTemplate
  let goalTemplateToDelete
  let goal
  let suspendedGoal

  const goalName = faker.random.words(10)

  beforeAll(async () => {
    goalTemplate = await createGoalTemplate({
      name: goalName,
    })
    goalTemplateToDelete = await createGoalTemplate({
      name: goalName,
    })
    recipient = await createRecipient()
    grant = await createGrant({ recipientId: recipient.id })
    secondGrant = await createGrant({ recipientId: recipient.id })
    thirdGrant = await createGrant({ recipientId: recipient.id })
    goal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.NOT_STARTED,
      name: goalName,
      goalTemplateId: goalTemplate.id,
    })
    suspendedGoal = await createGoal({
      grantId: secondGrant.id,
      status: GOAL_STATUS.SUSPENDED,
      name: goalName,
      goalTemplateId: goalTemplate.id,
    })
  })

  afterAll(async () => {
    await Goal.destroy({
      where: { grantId: [grant.id, secondGrant.id, thirdGrant.id] },
      force: true,
    })
    await GoalTemplate.destroy({
      where: { id: [goalTemplate.id, goalTemplateToDelete.id] },
      force: true,
    })
    await Grant.destroy({
      where: {
        id: [grant.id, secondGrant.id, thirdGrant.id],
      },
      individualHooks: true,
    })
    await Recipient.destroy({ where: { id: recipient.id } })
    await sequelize.close()
  })

  it('should create a goal from template', async () => {
    const newGoalIds = await goalsFromTemplate(goalTemplate.id, 1, {
      grants: [thirdGrant.id],
      regionId: thirdGrant.regionId,
    })

    expect(newGoalIds.length).toBe(1)
    const newGoal = await Goal.findByPk(newGoalIds[0])

    expect(newGoal).not.toBeNull()
    expect(newGoal.name).toBe(goalName)
    expect(newGoal.goalTemplateId).toBe(goalTemplate.id)
    expect(newGoal.status).toBe(GOAL_STATUS.NOT_STARTED)
  })

  it('should throw an error if the template does not exist', async () => {
    const goalTemplateToDeleteId = goalTemplateToDelete.id
    await GoalTemplate.destroy({
      where: { id: goalTemplateToDeleteId },
    })

    await expect(
      goalsFromTemplate(999999, 1, {
        grants: [thirdGrant.id],
        regionId: thirdGrant.regionId,
      })
    ).rejects.toThrow()
  })

  it('should return an existing goal if it uses the template', async () => {
    const existingGoalIds = await goalsFromTemplate(goalTemplate.id, 1, {
      grants: [grant.id],
      regionId: grant.regionId,
    })

    expect(existingGoalIds.length).toBe(1)
    expect(existingGoalIds[0]).toBe(goal.id)
  })

  it('should unsuspend existing goals if they use the template', async () => {
    const existingGoalIds = await goalsFromTemplate(goalTemplate.id, 1, {
      grants: [secondGrant.id],
      regionId: secondGrant.regionId,
    })

    expect(existingGoalIds.length).toBe(1)
    expect(existingGoalIds[0]).toBe(suspendedGoal.id)
    const updatedGoal = await Goal.findByPk(suspendedGoal.id)

    expect(updatedGoal.status).toBe(GOAL_STATUS.IN_PROGRESS)
  })
})
