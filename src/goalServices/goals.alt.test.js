import faker from '@faker-js/faker'
import crypto from 'crypto'
import { determineMergeGoalStatus } from '@ttahub/common'
import db, { Recipient, Grant, Goal, GoalTemplate, Objective, ActivityReportGoal, ActivityReport, ActivityRecipient, User } from '../models'
import { createMultiRecipientGoalsFromAdmin } from './goals'
import { reduceObjectives, reduceObjectivesForActivityReport } from './reduceGoals'
import { OBJECTIVE_STATUS, AUTOMATIC_CREATION, GOAL_STATUS } from '../constants'
import { setFieldPromptsForCuratedTemplate } from '../services/goalTemplates'

jest.mock('../services/goalTemplates', () => ({
  setFieldPromptsForCuratedTemplate: jest.fn(),
}))

const objectivesToReduce = [
  {
    id: 1,
    title: ' This has leading and trailing spaces. ',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 2,
    title: 'This has leading and trailing spaces. ',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 3,
    title: ' This has leading and trailing spaces.',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 4,
    title: "This doesn't leading and trailing spaces.",
    status: OBJECTIVE_STATUS.COMPLETE,
  },
]

describe('Goals DB service', () => {
  afterAll(async () => {
    await db.sequelize.close()
  })

  describe('createMultiRecipientGoalsFromAdmin', () => {
    let user
    let recipient
    let grant
    let secondGrant
    let template

    const existingGoalName = faker.datatype.string(100)

    let mockRequestData

    beforeAll(async () => {
      user = await User.create({
        homeRegionId: 1,
        hsesUsername: faker.internet.email(),
        hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
        email: faker.internet.email(),
        phoneNumber: faker.phone.phoneNumber(),
        name: faker.name.findName(),
        role: ['Grants Specialist'],
        lastLogin: new Date(),
      })

      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
        startDate: new Date(),
        endDate: new Date(),
      })

      // Grant.
      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      })

      secondGrant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      })

      await Goal.create({
        name: existingGoalName,
        status: 'Draft',
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      })

      const templateName = faker.name.firstName()
      const secret = 'secret'
      const hash = crypto.createHmac('md5', secret).update(templateName).digest('hex')

      template = await GoalTemplate.create({
        hash,
        templateName,
        creationMethod: AUTOMATIC_CREATION,
      })

      mockRequestData = {
        region: String(user.homeRegionId),
        group: '1',
        createReport: false,
        useCuratedGoal: false,
        creator: String(user.id),
        templateId: null,
        goalSource: '',
        goalDate: '',
        selectedGrants: JSON.stringify([{ id: grant.id }]),
        goalText: '',
      }
    })

    afterAll(async () => {
      const goals = await Goal.findAll({
        where: {
          grantId: [grant.id, secondGrant.id],
        },
      })

      const goalIds = goals.map((goal) => goal.id)

      await ActivityReportGoal.destroy({
        where: {
          goalId: goalIds,
        },
      })

      await ActivityRecipient.destroy({
        where: {
          grantId: [grant.id, secondGrant.id],
        },
      })

      await ActivityReport.destroy({
        where: {
          userId: user.id,
        },
        force: true,
      })

      await Goal.destroy({
        where: {
          id: goalIds,
        },
        force: true,
      })

      await GoalTemplate.destroy({
        where: {
          id: template.id,
        },
      })

      await Grant.destroy({
        where: {
          id: [grant.id, secondGrant.id],
        },
        individualHooks: true,
      })

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      })

      await User.destroy({
        where: {
          id: user.id,
        },
      })
    })

    it('will not create a new goal if a goal with that name already exists', async () => {
      const response = await createMultiRecipientGoalsFromAdmin({
        ...mockRequestData,
        goalText: existingGoalName,
      })
      expect(response).toEqual({
        isError: true,
        message: `A goal with that name already exists for grants ${grant.number}`,
        grantsForWhomGoalAlreadyExists: [grant.id],
      })
    })

    it('will skip creating but continue if a goal with that name already exists', async () => {
      const response = await createMultiRecipientGoalsFromAdmin({
        ...mockRequestData,
        selectedGrants: JSON.stringify([{ id: grant.id }, { id: secondGrant.id }]),
        goalText: existingGoalName,
        createMissingGoals: true,
      })
      const { grantsForWhomGoalAlreadyExists, isError, message, goals } = response
      expect(grantsForWhomGoalAlreadyExists.length).toBe(1)
      expect(isError).toBe(false)
      expect(message).toBe(`A goal with that name already exists for grants ${grant.number}`)
      expect(goals).toHaveLength(1)
      expect(goals[0].name).toBe(existingGoalName)
      expect(goals[0].grantId).toBe(secondGrant.id)
    })

    it('requires a goal name to proceed', async () => {
      const response = await createMultiRecipientGoalsFromAdmin({
        ...mockRequestData,
        goalText: '',
      })
      expect(response).toEqual({
        isError: true,
        message: 'Goal name is required',
        grantsForWhomGoalAlreadyExists: [],
      })
    })

    it('loads the goal name from template and passes off prompts', async () => {
      const data = {
        ...mockRequestData,
        goalText: '',
        useCuratedGoal: true,
        templateId: template.id,
        goalPrompts: [{ promptId: 1, fieldName: 'fei-root-cause' }],
        'fei-root-cause': ['Workforce'],
      }
      const response = await createMultiRecipientGoalsFromAdmin(data)
      expect(response.activityReport).toBe(null)
      expect(response.data).toEqual(data)
      expect(response.goals.length).toBe(1)
      expect(response.goals[0].name).toBe(template.templateName)
      expect(setFieldPromptsForCuratedTemplate).toHaveBeenCalledWith(expect.anything(), [{ promptId: 1, response: ['Workforce'] }])
    })

    it('creates a new goal', async () => {
      const goalText = faker.datatype.string(100)
      const data = {
        ...mockRequestData,
        goalText,
        goalSource: 'Recipient request',
      }
      const response = await createMultiRecipientGoalsFromAdmin(data)
      expect(response.activityReport).toBe(null)
      expect(response.data).toEqual(data)
      expect(response.goals.length).toBe(1)
      expect(response.goals[0].name).toBe(goalText)
    })

    it('creates a new report', async () => {
      const goalText = faker.datatype.string(100)
      const data = {
        ...mockRequestData,
        goalText,
        goalSource: 'Recipient request',
        createReport: true,
      }
      const response = await createMultiRecipientGoalsFromAdmin(data)
      expect(response.activityReport).not.toBe(null)
      expect(response.activityReport.userId).toBe(user.id)
      expect(response.data).toEqual(data)
      expect(response.goals.length).toBe(1)
      expect(response.goals[0].name).toBe(goalText)
    })
  })

  describe('determineMergeGoalStatus', () => {
    it('at least one in progress', async () => {
      const status = determineMergeGoalStatus([GOAL_STATUS.IN_PROGRESS, GOAL_STATUS.CLOSED])
      expect(status).toBe(GOAL_STATUS.IN_PROGRESS)
    })

    it('at least one closed', async () => {
      const status = determineMergeGoalStatus([GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED])
      expect(status).toBe(GOAL_STATUS.CLOSED)
    })

    it('at least one suspended', async () => {
      const status = determineMergeGoalStatus([GOAL_STATUS.SUSPENDED, GOAL_STATUS.NOT_STARTED])
      expect(status).toBe(GOAL_STATUS.SUSPENDED)
    })

    it('not started', async () => {
      const status = determineMergeGoalStatus([GOAL_STATUS.NOT_STARTED, GOAL_STATUS.DRAFT])
      expect(status).toBe(GOAL_STATUS.NOT_STARTED)
    })

    it('DRAFT', async () => {
      const status = determineMergeGoalStatus([GOAL_STATUS.DRAFT, GOAL_STATUS.DRAFT])
      expect(status).toBe(GOAL_STATUS.DRAFT)
    })
  })

  describe('reduce objectives', () => {
    let recipient
    let grant
    let goal
    let objectiveOne
    let objectiveTwo
    let objectiveThree
    let objectiveFour

    beforeAll(async () => {
      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
        startDate: new Date(),
        endDate: new Date(),
      })

      // Grant.
      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      })

      // Goal.
      goal = await Goal.create({
        name: '    Goal for Objectives with leading and trailing values    ',
        status: 'Draft',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      })

      // Objectives.
      objectiveOne = await Objective.create({
        ...objectivesToReduce[0],
        goalId: goal.id,
      })
      objectiveTwo = await Objective.create({
        ...objectivesToReduce[1],
        goalId: goal.id,
      })
      objectiveThree = await Objective.create({
        ...objectivesToReduce[2],
        goalId: goal.id,
      })
      objectiveFour = await Objective.create({
        ...objectivesToReduce[3],
        goalId: goal.id,
      })
    })

    afterAll(async () => {
      // Objectives.
      await Objective.destroy({
        where: {
          id: objectiveOne.id,
        },
        force: true,
      })
      await Objective.destroy({
        where: {
          id: objectiveTwo.id,
        },
        force: true,
      })
      await Objective.destroy({
        where: {
          id: objectiveThree.id,
        },
        force: true,
      })
      await Objective.destroy({
        where: {
          id: objectiveFour.id,
        },
        force: true,
      })

      // Goal.
      await Goal.destroy({
        where: {
          id: goal.id,
        },
        force: true,
      })

      // Grant.
      await Grant.destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
      })

      // Recipient.
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      })
    })

    it('objective reduce returns the correct number of objectives with spaces', async () => {
      const reducedObjectives = reduceObjectives([objectiveOne, objectiveTwo, objectiveThree, objectiveFour])
      expect(reducedObjectives.length).toBe(2)
      expect(reducedObjectives[0].title.trim()).toBe('This has leading and trailing spaces.')
      expect(reducedObjectives[1].title).toBe("This doesn't leading and trailing spaces.")
    })

    it('ar reduce returns the correct number of objectives with spaces', async () => {
      const reducedObjectives = reduceObjectivesForActivityReport([objectiveOne, objectiveTwo, objectiveThree, objectiveFour])
      expect(reducedObjectives.length).toBe(2)
      expect(reducedObjectives[0].title.trim()).toBe('This has leading and trailing spaces.')
      expect(reducedObjectives[1].title).toBe("This doesn't leading and trailing spaces.")
    })
  })
})
