/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker'
import { GOAL_SOURCES } from '@ttahub/common'
import { createOrUpdateGoals } from './goals'
import db, { Goal, Grant, Recipient, Objective } from '../models'

describe('createOrUpdateGoals', () => {
  afterEach(async () => {
    jest.clearAllMocks()
  })

  let goal
  let objective
  let recipient
  let newGoals
  let grants = [
    {
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    },
    {
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    },
  ]

  beforeAll(async () => {
    recipient = await Recipient.create({
      name: 'recipient',
      id: faker.datatype.number(),
      uei: faker.datatype.string(12),
    })
    grants = await Promise.all(grants.map((g) => Grant.create({ ...g, recipientId: recipient.id })))

    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
      grantId: grants[0].id,
      source: GOAL_SOURCES[0],
      createdVia: 'activityReport',
    })

    objective = await Objective.create({
      goalId: goal.id,
      title: 'This is some serious goal text',
      status: 'Not Started',
    })

    await Objective.create({
      goalId: goal.id,
      title: 'This objective will be deleted',
      status: 'Not Started',
    })
  })

  afterAll(async () => {
    const goals = await Goal.findAll({
      where: {
        grantId: grants.map((g) => g.id),
      },
    })

    const goalIds = goals.map((g) => g.id)

    await Objective.destroy({
      where: {
        goalId: goalIds,
      },
      individualHooks: true,
      force: true,
    })

    await Goal.destroy({
      where: {
        id: goalIds,
      },
      individualHooks: true,
      force: true,
    })

    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
      individualHooks: true,
    })

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
      individualHooks: true,
    })

    await db.sequelize.close()
  })

  it('creates new goals and updates existing ones', async () => {
    const basicGoal = {
      recipientId: recipient.id,
      regionId: 1,
      name: 'This is some serious goal text',
      grantId: goal.grantId,
      status: 'Draft',
    }
    newGoals = await createOrUpdateGoals([
      {
        ...basicGoal,
        id: goal.id,
        ids: [goal.id],
        createdVia: 'activityReport',
        status: 'Not Started',
        objectives: [
          {
            id: objective.id,
            status: 'Not Started',
            title: 'This is an objective',
          },
          {
            id: 'new-0',
            isNew: true,
            status: 'Not Started',
            title: 'This is another objective',
          },
        ],
      },
      {
        ...basicGoal,
        grantId: grants[1].id,
        isNew: true,
        objectives: [],
        ids: [goal.id],
      },
    ])

    expect(newGoals).toHaveLength(2)

    const ids = newGoals.flatMap((g) => g.goalIds)
    expect(ids.length).toBe(2)
    expect(ids).toContain(goal.id)

    const statuses = newGoals.map((g) => g.status)
    expect(statuses.length).toBe(2)
    expect(statuses).toContain('Not Started')
    expect(statuses).toContain('Draft')

    const isCurateds = newGoals.map((g) => g.isCurated)
    isCurateds.forEach((isCurated) => {
      expect(isCurated).toBeDefined()
    })

    const createdVias = newGoals.map((g) => g.createdVia)
    expect(createdVias.length).toBe(2)
    expect(createdVias).toContain('activityReport')
    expect(createdVias).toContain('rtr')

    const updatedGoal = newGoals.find((g) => g.goalIds.includes(goal.id))
    expect(updatedGoal.name).toBe('This is some serious goal text')
    expect(updatedGoal.grantIds.length).toBe(1)
    expect(Object.values(updatedGoal.source)).toStrictEqual([GOAL_SOURCES[0]])

    const grantIds = newGoals.flatMap((g) => g.grantIds)
    expect(grantIds.length).toBe(2)
    expect(grantIds).toContain(grants[0].id)
    expect(grantIds).toContain(grants[1].id)

    const grantRegions = updatedGoal.grants.map((g) => g.regionId)
    const grantRecipients = updatedGoal.grants.map((g) => g.recipientId)

    expect(grantRegions).toContain(1)
    expect(grantRecipients).toContain(recipient.id)

    const objectivesOnUpdatedGoal = updatedGoal.objectives

    expect(objectivesOnUpdatedGoal.length).toBe(2)
    const titles = objectivesOnUpdatedGoal.map((obj) => obj.title)
    expect(titles).toContain('This is another objective')
    expect(titles).toContain('This is an objective')
    expect(titles).not.toContain('This objective will be deleted')

    // should always be in the same order, by rtr order
    const order = objectivesOnUpdatedGoal.map((obj) => obj.rtrOrder)
    expect(order).toStrictEqual([1, 2])

    const objectiveOnTheGoalWithCreatedVias = await Objective.findAll({
      attributes: ['id', 'createdVia'],
      where: {
        id: objectivesOnUpdatedGoal.map((obj) => obj.id),
      },
      order: [['id', 'ASC']],
    })
    const objectiveCreatedVias = objectiveOnTheGoalWithCreatedVias.map((obj) => obj.createdVia)
    expect(objectiveCreatedVias).toStrictEqual([null, 'rtr'])

    const objectiveOnUpdatedGoal = await Objective.findByPk(objective.id, { raw: true })
    expect(objectiveOnUpdatedGoal.id).toBe(objective.id)
    expect(objectiveOnUpdatedGoal.title).toBe('This is an objective')
    expect(objectiveOnUpdatedGoal.status).toBe(objective.status)

    const newGoal = newGoals.find((g) => g.id !== goal.id)
    expect(newGoal.status).toBe('Draft')
    expect(newGoal.name).toBe('This is some serious goal text')
    expect(newGoal.grant.id).toBe(grants[1].id)
    expect(newGoal.grant.regionId).toBe(1)
  })
})
