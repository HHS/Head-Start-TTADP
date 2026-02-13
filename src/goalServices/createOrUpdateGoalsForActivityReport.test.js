/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker'
import { REPORT_STATUSES } from '@ttahub/common'
import crypto from 'crypto'
import { createOrUpdateGoalsForActivityReport } from './goals'
import db, { Goal, Grant, Recipient, Objective, ActivityReport, ActivityReportGoal, ActivityReportObjective, User, GoalTemplate } from '../models'
import { AUTOMATIC_CREATION } from '../constants'

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user1134265161',
  hsesUsername: 'user1134265161',
  hsesUserId: 'user1134265161',
  lastLogin: new Date(),
}

const report = {
  regionId: 1,
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  objectivesWithoutGoals: [],
  goals: [],
  version: 2,
}

describe('createOrUpdateGoalsForActivityReport', () => {
  afterEach(async () => {
    jest.clearAllMocks()
  })

  let activityReport
  let user
  let recipient
  let template

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

  let goalIds

  beforeAll(async () => {
    user = await User.create(mockUser)
    const goalTemplateName = 'Test create goal for activity reports'
    const secret = 'secret'
    const hash = crypto.createHmac('md5', secret).update(goalTemplateName).digest('hex')

    template = await GoalTemplate.create({
      hash,
      templateName: goalTemplateName,
      creationMethod: AUTOMATIC_CREATION,
    })

    recipient = await Recipient.create({
      name: 'recipient',
      id: faker.datatype.number(),
      uei: faker.datatype.string(12),
    })

    grants = await Promise.all(grants.map((g) => Grant.create({ ...g, recipientId: recipient.id })))

    // Recipient Report.
    activityReport = await ActivityReport.create({
      ...report,
      userId: user.id,
      lastUpdatedById: user.id,
      activityRecipients: { activityRecipientId: recipient.id },
      pageState: {
        1: 'In progress',
        2: 'Not started',
        3: 'Not started',
        4: 'Not started',
      },
    })
  })

  afterAll(async () => {
    // Delete ARO.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: activityReport.id,
      },
    })

    // Delete ARG.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: activityReport.id,
      },
    })

    // Delete Recipient Obj's
    await Objective.destroy({
      where: {
        [db.Sequelize.Op.or]: [{ goalId: goalIds }, { createdViaActivityReportId: activityReport.id }],
      },
      force: true,
    })

    // Delete Recipient AR.
    await ActivityReport.destroy({ where: { id: activityReport.id } })

    // Delete Goal.
    await Goal.destroy({
      where: {
        id: goalIds,
      },
      force: true,
    })

    // Delete Grant.
    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
      individualHooks: true,
    })

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    })

    // Delete Goal Template.
    await GoalTemplate.destroy({
      where: {
        id: template.id,
      },
    })

    // Delete User.
    await User.destroy({
      where: {
        id: user.id,
      },
    })

    // Close Conn.
    await db.sequelize.close()
  })

  it('creates recipient new goals and updates existing ones', async () => {
    const goalsToCreate = [
      {
        goalIds: [],
        goalNumber: '',
        grantIds: grants.map((g) => g.id),
        id: 'new',
        isNew: true,
        isRttapa: 'Yes',
        label: 'Create new goal',
        name: 'Test create goal for activity reports',
        number: false,
        oldGrantIds: [],
        onApprovedAR: false,
        regionId: 1,
        status: 'Draft',
        goalTemplateId: template.id,
        objectives: [
          {
            title: 'Test create goal for activity reports - Obj 1',
            status: 'Not Started',
            ttaProvided: '<p>Test create goal for activity reports - Obj 1 tta</p>',
            topics: [],
            resources: [],
            files: [],
          },
          {
            title: 'Test create goal for activity reports - Obj 2',
            status: 'In Progress',
            ttaProvided: '<p>Test create goal for activity reports - Obj 2 tta</p>',
            topics: [],
            resources: [],
            files: [],
          },
          {
            title: 'Test create goal for activity reports - Obj 3',
            status: 'Complete',
            ttaProvided: '<p>Test create goal for activity reports - Obj 3 tta</p>',
            topics: [],
            resources: [],
            files: [],
          },
        ],
      },
    ]
    let createdGoals = await createOrUpdateGoalsForActivityReport(goalsToCreate, activityReport.id, mockUser.id)

    goalIds = createdGoals[0].goalIds

    // Goal.
    expect(createdGoals.length).toBe(1)
    expect(createdGoals[0].id).not.toBeNull()
    expect(createdGoals[0].name).toBe('Test create goal for activity reports')
    expect(createdGoals[0].grantIds.sort()).toStrictEqual(grants.map((g) => g.id).sort())
    expect(createdGoals[0].objectives.length).toBe(3)

    // Objectives (sorted by order).
    expect(createdGoals[0].objectives[0].id).not.toBeNull()
    expect(createdGoals[0].objectives[0].title).toBe('Test create goal for activity reports - Obj 1')
    expect(createdGoals[0].objectives[0].ttaProvided).toBe('<p>Test create goal for activity reports - Obj 1 tta</p>')
    expect(createdGoals[0].objectives[0].status).toBe('Not Started')
    expect(createdGoals[0].objectives[0].arOrder).toBe(1)

    expect(createdGoals[0].objectives[1].id).not.toBeNull()
    expect(createdGoals[0].objectives[1].title).toBe('Test create goal for activity reports - Obj 2')
    expect(createdGoals[0].objectives[1].ttaProvided).toBe('<p>Test create goal for activity reports - Obj 2 tta</p>')
    expect(createdGoals[0].objectives[1].status).toBe('In Progress')
    expect(createdGoals[0].objectives[1].arOrder).toBe(2)

    expect(createdGoals[0].objectives[2].id).not.toBeNull()
    expect(createdGoals[0].objectives[2].title).toBe('Test create goal for activity reports - Obj 3')
    expect(createdGoals[0].objectives[2].ttaProvided).toBe('<p>Test create goal for activity reports - Obj 3 tta</p>')
    expect(createdGoals[0].objectives[2].status).toBe('Complete')
    expect(createdGoals[0].objectives[2].arOrder).toBe(3)

    // Remove an Objective.
    createdGoals[0].objectives.splice(1, 1)

    // Update TTA Provided.
    const updatedGoal = [
      {
        ...createdGoals[0],
        objectives: createdGoals[0].objectives.map((o, index) => ({
          ...o,
          title: `My new obj ${index + 1}`,
          ttaProvided: `<p>My new tta ${index + 1}</p>`,
          status: index === 0 ? 'Not Started' : 'Suspended',
          closeSuspendReason: index === 0 ? null : 'Recipient request',
          closeSuspendContext: index === 0 ? null : 'Test suspend context',
        })),
      },
    ]

    createdGoals = await createOrUpdateGoalsForActivityReport(updatedGoal, activityReport.id, mockUser.id)

    // Updated Goal.
    expect(createdGoals[0].id).not.toBeNull()
    expect(createdGoals[0].name).toBe('Test create goal for activity reports')
    expect(createdGoals[0].grantIds.sort()).toStrictEqual(grants.map((g) => g.id).sort())
    expect(createdGoals[0].objectives.length).toBe(2)

    expect(createdGoals[0].objectives[0].id).not.toBeNull()
    expect(createdGoals[0].objectives[0].title).toBe('My new obj 1')
    expect(createdGoals[0].objectives[0].ttaProvided).toBe('<p>My new tta 1</p>')
    expect(createdGoals[0].objectives[0].status).toBe('Not Started')
    expect(createdGoals[0].objectives[0].arOrder).toBe(1)

    expect(createdGoals[0].objectives[1].id).not.toBeNull()
    expect(createdGoals[0].objectives[1].title).toBe('My new obj 2')
    expect(createdGoals[0].objectives[1].ttaProvided).toBe('<p>My new tta 2</p>')
    expect(createdGoals[0].objectives[1].status).toBe('Suspended')
    expect(createdGoals[0].objectives[1].closeSuspendReason).toBe('Recipient request')
    expect(createdGoals[0].objectives[1].closeSuspendContext).toBe('Test suspend context')
    expect(createdGoals[0].objectives[1].arOrder).toBe(2)

    const updatedReport = await ActivityReport.findByPk(activityReport.id)
    expect(updatedReport.pageState).toStrictEqual({
      1: 'In progress',
      2: 'In progress',
      3: 'Not started',
      4: 'Not started',
    })
  })
})
