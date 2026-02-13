import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { GOAL_SOURCES } from '@ttahub/common'
import {
  User,
  Goal,
  GoalFieldResponse,
  Objective,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCourse,
  ActivityReportObjectiveCitation,
  ActivityReportGoalFieldResponse,
  GoalTemplateFieldPrompt,
  Topic,
  Course,
  ActivityReportObjectiveTopic,
} from '../models'
import { cacheGoalMetadata, cacheCourses, cacheCitations, cacheTopics } from './reportCache'
import { createReport, createGrant, createRecipient, createGoal } from '../testUtils'
import { GOAL_STATUS } from '../constants'
import { auditLogger } from '../logger'
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction'

describe('cacheCourses', () => {
  let courseOne
  let courseTwo
  let activityReport
  let grant
  let recipient
  let goal
  let objective
  let aro
  let snapShot

  beforeAll(async () => {
    // Create a snapshot of the database so we can rollback after the tests.
    snapShot = await captureSnapshot()

    recipient = await createRecipient({})
    grant = await createGrant({ recipientId: recipient.id })

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId: grant.id,
        },
      ],
    })

    goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS })

    objective = await Objective.create({
      goalId: goal.id,
      title: faker.datatype.string(200),
      status: 'Not Started',
    })

    courseOne = await Course.create({
      name: faker.datatype.string(200),
    })

    courseTwo = await Course.create({
      name: faker.datatype.string(200),
    })

    aro = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: activityReport.id,
    })

    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aro.id,
      courseId: courseOne.id,
    })
  })

  afterAll(async () => {
    await rollbackToSnapshot(snapShot)
  })

  it('should cache courses', async () => {
    await cacheCourses(objective.id, aro.id, [{ id: courseTwo.id }])

    const aroCourses = await ActivityReportObjectiveCourse.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    })

    expect(aroCourses).toHaveLength(1)
    expect(aroCourses[0].courseId).toEqual(courseTwo.id)
  })
})

describe('cacheTopics', () => {
  let mockAuditLoggerError
  let mockAuditLoggerInfo
  let mockFindAll
  let mockCreate
  let mockDestroy
  let mockFindAllAROTopics

  beforeEach(() => {
    mockAuditLoggerError = jest.spyOn(auditLogger, 'error').mockImplementation()
    mockAuditLoggerInfo = jest.spyOn(auditLogger, 'info').mockImplementation()

    mockFindAll = jest.spyOn(Topic, 'findAll').mockResolvedValue([{ id: 101, name: 'Topic 1' }])

    mockFindAllAROTopics = jest.spyOn(ActivityReportObjectiveTopic, 'findAll').mockResolvedValue([])

    mockCreate = jest.spyOn(ActivityReportObjectiveTopic, 'create').mockResolvedValue({})
    mockDestroy = jest.spyOn(ActivityReportObjectiveTopic, 'destroy').mockResolvedValue(1)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('resolves missing topic IDs by name', async () => {
    const topics = [{ name: 'Topic 1' }]

    await cacheTopics(1, 1, topics)

    expect(mockAuditLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Some topics were missing IDs'))
    expect(mockFindAll).toHaveBeenCalledWith({ where: { name: ['Topic 1'] } })
    expect(mockCreate).toHaveBeenCalledWith({ activityReportObjectiveId: 1, topicId: 101 })
  })

  it('logs an error if topic name cannot be resolved', async () => {
    mockFindAll.mockResolvedValue([]) // simulate no matches found

    const topics = [{ name: 'Unknown Topic' }]
    await cacheTopics(42, 99, topics)

    expect(mockAuditLoggerError).toHaveBeenCalledWith(expect.stringContaining('Could not resolve topic names: Unknown Topic'))
  })

  it('does nothing if all topics already exist and are unchanged', async () => {
    mockFindAllAROTopics.mockResolvedValue([{ topicId: 101 }])

    const topics = [{ id: 101, name: 'Topic 1' }]
    await cacheTopics(1, 1, topics)

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockDestroy).not.toHaveBeenCalled()
  })

  it('adds and removes topics correctly', async () => {
    mockFindAllAROTopics.mockResolvedValue([{ topicId: 200 }, { topicId: 300 }])

    const topics = [{ id: 101, name: 'Topic 1' }]
    await cacheTopics(1, 1, topics)

    expect(mockCreate).toHaveBeenCalledWith({ activityReportObjectiveId: 1, topicId: 101 })
    expect(mockDestroy).toHaveBeenCalledWith({
      where: {
        activityReportObjectiveId: 1,
        topicId: { [Op.in]: [200, 300] },
      },
      individualHooks: true,
      hookMetadata: { objectiveId: 1 },
    })
  })
})

describe('activityReportObjectiveCitation', () => {
  let activityReport
  let grant
  let recipient
  let goal
  let nonMonitoringGoal
  let objective
  let nonMonitoringObjective
  let aro
  let nonMonitoringAro
  const citationIds = []
  let snapShot

  beforeAll(async () => {
    // Create a snapshot of the database so we can rollback after the tests.
    snapShot = await captureSnapshot()

    recipient = await createRecipient({})

    grant = await createGrant({ recipientId: recipient.id })

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId: grant.id,
        },
      ],
    })

    goal = await Goal.create({
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.NOT_STARTED,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grant.id,
      createdVia: 'monitoring',
    })

    nonMonitoringGoal = await Goal.create({
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.NOT_STARTED,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grant.id,
      createdVia: 'activityReport',
    })

    objective = await Objective.create({
      goalId: goal.id,
      title: faker.datatype.string(200),
      status: 'Not Started',
    })

    nonMonitoringObjective = await Objective.create({
      goalId: nonMonitoringGoal.id,
      title: faker.datatype.string(200),
      status: 'Not Started',
    })

    aro = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: activityReport.id,
    })

    nonMonitoringAro = await ActivityReportObjective.create({
      objectiveId: nonMonitoringObjective.id,
      activityReportId: activityReport.id,
    })

    const nonMonitoringCitation = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: nonMonitoringAro.id,
      citation: 'Non Monitoring Citation 1',
      monitoringReferences: [
        {
          grantId: grant.id,
          findingId: 1,
          reviewName: 'Review 1',
        },
      ],
    })
    citationIds.push(nonMonitoringCitation.id)
  })

  afterAll(async () => {
    try {
      await rollbackToSnapshot(snapShot)
    } catch (error) {
      // TODO: Figure out the correct way to insert the monitoring references
      auditLogger.error(`Error rolling back snapshot - activityReportObjectiveCitation: ${error}`)
    }
  })

  it('should create, read, update, and delete', async () => {
    // Create a new ActivityReportObjectiveCitation.
    const citationsToCreate = [
      {
        citation: 'Citation 1',
        monitoringReferences: [
          {
            grantId: grant.id,
            findingId: 1,
            reviewName: 'Review 1',
          },
        ],
      },
    ]

    // Save the ActivityReportObjectiveCitation.
    let result = await cacheCitations(objective.id, aro.id, citationsToCreate)

    // Assert created.
    expect(result[0]).toBeDefined()

    const createdAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    })

    const citation1Id = createdAroCitations[0].id
    citationIds.push(citation1Id)

    expect(createdAroCitations).toHaveLength(1)
    expect(createdAroCitations[0].citation).toEqual('Citation 1')
    expect(createdAroCitations[0].monitoringReferences).toEqual([
      {
        grantId: grant.id,
        findingId: 1,
        reviewName: 'Review 1',
      },
    ])

    // Update the ActivityReportObjectiveCitation.
    const citationsToUpdate = [
      {
        id: citation1Id,
        citation: 'Citation 1 Updated',
        monitoringReferences: [
          {
            grantId: grant.id,
            findingId: 1,
            reviewName: 'Review 1 Updated',
          },
        ],
      },
    ]

    result = await cacheCitations(objective.id, aro.id, citationsToUpdate)

    // Assert updated.
    expect(result[0]).toBeDefined()

    const updatedAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    })

    expect(updatedAroCitations).toHaveLength(1)
    expect(updatedAroCitations[0].citation).toEqual('Citation 1 Updated')
    expect(updatedAroCitations[0].monitoringReferences).toEqual([
      {
        grantId: grant.id,
        findingId: 1,
        reviewName: 'Review 1 Updated',
      },
    ])

    // Delete the ActivityReportObjectiveCitation.
    result = await cacheCitations(objective.id, aro.id, [])

    // Assert deleted.
    expect(result).toHaveLength(0)

    const deletedAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    })

    expect(deletedAroCitations).toHaveLength(0)
  })

  it('should only return one citation if there is more than one with the same standard id', async () => {
    const citationsToCreate = [
      {
        citation: 'Citation 1',
        standardId: 200039,
        monitoringReferences: [
          {
            acro: 'TST',
            grantId: grant.id,
            citation: '78',
            severity: 2,
            findingId: 'BCCE55A1-5108-442B-99F1-1B8FFB5B31CC',
            reviewName: '247691FUA',
            findingType: 'Noncompliance',
            grantNumber: '02CH010989',
            findingSource: ' Test Infrastructure Citation',
            originalGrantId: grant.id,
            reportDeliveryDate: '2025-02-16T05:00:00+00:00',
            monitoringFindingStatusName: 'Active',
            standardId: 200039,
            name: 'TST - 78 -  Test Infrastructure Citation',
          },
          {
            acro: 'TST',
            grantId: grant.id,
            citation: '78',
            severity: 2,
            findingId: 'BCCE55A1-5108-442B-99F1-1B8FFB5B31CC',
            reviewName: '247691FUA',
            findingType: 'Noncompliance',
            grantNumber: '02CH012742',
            findingSource: 'Test Infrastructure Citation',
            originalGrantId: grant.id,
            reportDeliveryDate: '2025-02-16T05:00:00+00:00',
            monitoringFindingStatusName: 'Active',
            standardId: 200039,
            name: 'TST - 78 - Test Infrastructure Citation',
          },
        ],
      },
    ]

    const result = await cacheCitations(objective.id, aro.id, citationsToCreate)

    expect(result).toHaveLength(1)
  })
  it('correctly saves aro citations per grant', async () => {
    const multiGrantCitations = [
      {
        citation: 'Citation 1',
        monitoringReferences: [
          {
            grantId: grant.id,
            findingId: 1,
            reviewName: 'Review 1',
            standardId: 1,
          },
        ],
      },
      {
        citation: 'Citation 2',
        monitoringReferences: [
          {
            grantId: 2,
            findingId: 1,
            reviewName: 'Review 2',
            standardId: 2,
          },
        ],
      },
      {
        citation: 'Citation 3',
        monitoringReferences: [
          {
            grantId: 3,
            findingId: 1,
            reviewName: 'Review 3',
            standardId: 3,
          },
          {
            grantId: grant.id,
            findingId: 1,
            reviewName: 'Review 4',
            standardId: 4,
          },
        ],
      },
    ]

    await cacheCitations(objective.id, aro.id, multiGrantCitations)

    // Retrieve all citations for the aro.
    const aroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    })

    expect(aroCitations).toHaveLength(2)
    citationIds.push(aroCitations[0].id)
    citationIds.push(aroCitations[1].id)

    // Assert citations are saved correctly.
    expect(aroCitations[0].citation).toEqual('Citation 1')
    expect(aroCitations[0].monitoringReferences.length).toEqual(1)
    expect(aroCitations[0].monitoringReferences[0].grantId).toBe(grant.id)

    expect(aroCitations[1].citation).toEqual('Citation 3')
    expect(aroCitations[1].monitoringReferences.length).toEqual(1)
    expect(aroCitations[1].monitoringReferences[0].grantId).toBe(grant.id)
  })

  it('correctly removes and prevents the saving of citations for non-monitoring goals', async () => {
    // Get all the citations for nonMonitoringAro.
    const nonMonitoringAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: nonMonitoringAro.id,
      },
    })
    expect(nonMonitoringAroCitations).toHaveLength(1)

    const citationsToCreate = [
      {
        citation: 'Non-monitoring Citation to add',
        monitoringReferences: JSON.stringify([
          {
            grantId: grant.id,
            findingId: 1,
            reviewName: 'Review 1',
          },
        ]),
      },
    ]

    // Save the ActivityReportObjectiveCitation.
    const result = await cacheCitations(nonMonitoringObjective.id, nonMonitoringAro.id, citationsToCreate)

    // Assert created.
    expect(result).toEqual([])

    const createdAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: nonMonitoringAro.id,
      },
    })
    expect(createdAroCitations).toHaveLength(0)
  })
})

describe('cacheGoalMetadata', () => {
  let activityReport
  let goal

  let multiRecipientActivityReport
  let multiRecipientGoal
  let snapShot

  const mockUser = {
    id: faker.datatype.number(),
    homeRegionId: 1,
    name: 'user13706689',
    hsesUsername: 'user13706689',
    hsesUserId: 'user13706689',
    lastLogin: new Date(),
  }

  beforeAll(async () => {
    // Create a snapshot of the database so we can rollback after the tests.
    snapShot = await captureSnapshot()

    await User.create(mockUser)
    const grantId = faker.datatype.number()

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId,
        },
      ],
      userId: mockUser.id,
    })

    multiRecipientActivityReport = await createReport({
      activityRecipients: [
        {
          grantId,
        },
      ],
      userId: mockUser.id,
    })

    goal = await Goal.create({
      grantId,
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    })

    multiRecipientGoal = await Goal.create({
      grantId,
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      closeSuspendReason: null,
      closeSuspendContext: null,
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    })

    // Get GoalTemplateFieldPrompts where title = 'FEI root cause'.
    const fieldPrompt = await GoalTemplateFieldPrompt.findOne({
      where: {
        title: 'FEI root cause',
      },
    })

    // Create a GoalFieldResponse for the goal.
    await GoalFieldResponse.create({
      goalId: multiRecipientGoal.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: ['Family Circumstance', 'Facilities', 'Other ECE Care Options'],
      onAr: true,
      onApprovedAR: false,
    })
  })

  afterAll(async () => {
    // Rollback to the snapshot.
    await rollbackToSnapshot(snapShot)
  })

  it('should cache goal metadata', async () => {
    let arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    })

    expect(arg).toHaveLength(0)

    await cacheGoalMetadata(goal, activityReport.id, false)

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    })

    expect(arg).toHaveLength(1)

    const data = {
      name: goal.name,
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    }

    expect(arg[0].dataValues).toMatchObject(data)

    await cacheGoalMetadata(goal, activityReport.id, true, [], true)

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    })

    const updatedData = {
      ...data,
      isActivelyEdited: true,
    }
    expect(arg).toHaveLength(1)
    expect(arg[0].dataValues).toMatchObject(updatedData)
  })

  it('correctly handles multi recipient prompts', async () => {
    let arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
        goalId: multiRecipientActivityReport.id,
      },
    })

    expect(arg).toHaveLength(0)

    await cacheGoalMetadata(
      multiRecipientGoal,
      multiRecipientActivityReport.id,
      false,
      [], // Don't pass prompts should come from goal.
      true
    )

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
        goalId: multiRecipientGoal.id,
      },
    })

    expect(arg).toHaveLength(1)

    // Get the ActivityReportGoalFieldResponses for the arg.id.
    const fieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: arg[0].id,
      },
    })

    expect(fieldResponses).toHaveLength(1)
    expect(fieldResponses[0].dataValues.response).toEqual(['Family Circumstance', 'Facilities', 'Other ECE Care Options'])

    // Update goal field reposone for the goal..
    await GoalFieldResponse.update(
      {
        response: ['Family Circumstance UPDATED', 'New Response'],
      },
      {
        where: {
          goalId: multiRecipientGoal.id,
        },
      }
    )

    await cacheGoalMetadata(
      multiRecipientGoal,
      multiRecipientActivityReport.id,
      false,
      [], // Don't pass prompts should come from goal.
      true
    )

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
        goalId: multiRecipientGoal.id,
      },
    })
    expect(arg).toHaveLength(1)

    const updatedFieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: arg[0].id,
      },
    })

    expect(updatedFieldResponses).toHaveLength(1)
    expect(updatedFieldResponses[0].dataValues.response).toEqual(['Family Circumstance UPDATED', 'New Response'])
  })
})
