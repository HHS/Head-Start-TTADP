import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { CLOSE_SUSPEND_REASONS } from '@ttahub/common'
import { OBJECTIVE_STATUS, GOAL_STATUS } from '../constants'
import { closeMultiRecipientGoalsFromAdmin } from './goals'
import db, { Goal, Objective, Region, Recipient, Grant } from '../models'
import { createGrant, createRecipient } from '../testUtils'

describe('closeMultiRecipientGoalsFromAdmin', () => {
  let region
  let grant
  let recipient
  let goals
  let objectiveNotOnApprovedAr

  beforeAll(async () => {
    const regionId = faker.datatype.number({ min: 999 })
    region = await Region.create({
      id: regionId,
      name: `Region ${regionId}`,
    })
    recipient = await createRecipient()
    grant = await createGrant({ regionId: region.id, recipientId: recipient.id })

    goals = await Promise.all([
      Goal.create({
        name: faker.datatype.string(999),
        status: GOAL_STATUS.NOT_STARTED,
        grantId: grant.id,
        onAR: true,
        onApprovedAR: false,
      }),
      Goal.create({
        id: faker.datatype.number({ min: 999 }),
        name: faker.datatype.string(999),
        status: GOAL_STATUS.NOT_STARTED,
        grantId: grant.id,
        onAR: true,
        onApprovedAR: false,
      }),
      Goal.create({
        id: faker.datatype.number({ min: 999 }),
        name: faker.datatype.string(999),
        status: GOAL_STATUS.SUSPENDED,
        grantId: grant.id,
        onAR: true,
        onApprovedAR: false,
      }),
    ])

    const objectives = await Objective.bulkCreate([
      {
        goalId: goals[0].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[0].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[1].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[1].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.COMPLETE,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[2].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
    ])

    await Objective.update({ onApprovedAR: true }, { where: { id: objectives.map((objective) => objective.id) } })

    objectiveNotOnApprovedAr = await Objective.create({
      goalId: goals[1].id,
      title: faker.datatype.string(999),
      status: OBJECTIVE_STATUS.NOT_STARTED,
      onAR: true,
      onApprovedAR: false,
    })
  })

  afterAll(async () => {
    const goalIds = goals.map((goal) => goal.id)
    await Objective.destroy({ where: { goalId: goalIds }, force: true })
    await Goal.destroy({ where: { id: goalIds }, force: true })
    await Grant.destroy({ where: { id: grant.id }, force: true, individualHooks: true })
    await Recipient.destroy({ where: { id: recipient.id }, force: true })
    await Region.destroy({ where: { id: region.id }, force: true })
    await db.sequelize.close()
  })

  it('updates goals and objectives based on admin request', async () => {
    const data = {
      selectedGoal: {
        goalIds: [goals[0].id, goals[1].id],
        status: GOAL_STATUS.NOT_STARTED,
      },
      closeSuspendContext: 'This is some appropriate context',
      closeSuspendReason: CLOSE_SUSPEND_REASONS[0],
    }

    // expect the first try to throw
    await expect(closeMultiRecipientGoalsFromAdmin(data, 1)).rejects.toThrow()

    // now we update all the objectives to be on an approved AR
    await Objective.update({ onApprovedAR: true }, { where: { goalId: goals.map((goal) => goal.id) } })

    // then we try again
    const response = await closeMultiRecipientGoalsFromAdmin(data, 1)
    expect(response.isError).toBe(false)
    expect(response.goals.length).toBe(2)

    const updatedGoals = await Goal.findAll({
      attributes: ['id', 'status'],
      where: {
        id: response.goals.map((goal) => goal.id),
      },
      include: [
        {
          attributes: ['id', 'status', 'onApprovedAR', 'goalId', 'closeSuspendReason', 'closeSuspendContext'],
          model: Objective,
          as: 'objectives',
        },
      ],
    })

    updatedGoals.forEach((updatedGoal) => {
      expect(updatedGoal.status).toBe(GOAL_STATUS.CLOSED)
      updatedGoal.objectives.forEach((objective) => {
        const expectedStatus = objective.onApprovedAR ? OBJECTIVE_STATUS.COMPLETE : objectiveNotOnApprovedAr.status
        const expectedSuspendReason = objective.onApprovedAR ? data.closeSuspendReason : null
        const expectedSuspendContext = objective.onApprovedAR ? data.closeSuspendContext : null
        expect(objective.status).toBe(expectedStatus)
        expect(objective.closeSuspendReason).toBe(expectedSuspendReason)
        expect(objective.closeSuspendContext).toBe(expectedSuspendContext)
      })
    })

    // no objectives should have survived as it was not on an approved AR
    const aloneObjective = await Objective.findOne({
      attributes: ['id', 'status', 'onApprovedAR', 'goalId', 'closeSuspendContext', 'closeSuspendReason'],
      where: {
        goalId: [goals[0].id, goals[1].id],
        status: {
          [Op.not]: OBJECTIVE_STATUS.COMPLETE,
        },
      },
    })

    expect(aloneObjective).toBe(null)

    // we left goal 2 alone
    const goal2 = await Goal.findOne({
      attributes: ['id', 'status'],
      where: {
        id: goals[2].id,
      },
    })

    expect(goal2.status).toBe(GOAL_STATUS.SUSPENDED)

    // and it's objectives
    const goal2Objectives = await Objective.findAll({
      attributes: ['id', 'goalId', 'status'],
      where: {
        goalId: goals[2].id,
      },
    })

    goal2Objectives.forEach((objective) => {
      expect(objective.status).toBe(OBJECTIVE_STATUS.IN_PROGRESS)
    })
  })
})
