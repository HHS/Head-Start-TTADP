import faker from '@faker-js/faker'
import { REPORT_STATUSES, SUPPORT_TYPES } from '@ttahub/common'
import getGoalsForReport from './getGoalsForReport'
import { Goal, Objective, ActivityReport, ActivityReportGoal, ActivityReportObjective, User, sequelize } from '../models'
import { OBJECTIVE_STATUS } from '../constants'

describe('getGoalsForReport', () => {
  let goal
  let objective1
  let objective2
  let excludedGoal
  let excludeObjective
  let report
  let user

  beforeAll(async () => {
    // Create User.
    const userName = faker.random.word()

    user = await User.create({
      id: faker.datatype.number({ min: 1000 }),
      homeRegionId: 1,
      name: userName,
      hsesUsername: userName,
      hsesUserId: userName,
      lastLogin: new Date(),
    })

    // Create Included Goal.
    goal = await Goal.create({
      name: 'goal with multiple objectives',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2023-04-03'),
      grantId: 1,
    })

    // Create Included Objectives.
    objective1 = await Objective.create(
      {
        title: 'Include Goal - Excluded Objective 1',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.DRAFT,
      },
      { individualHooks: true }
    )

    objective2 = await Objective.create(
      {
        title: 'Include Goal - Included Objective 2',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.DRAFT,
      },
      { individualHooks: true }
    )

    // Create Exclude Goal.
    excludedGoal = await Goal.create({
      name: 'goal to exclude',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2023-04-03'),
      grantId: 1,
    })

    // Create Excluded Objectives.
    excludeObjective = await Objective.create(
      {
        title: 'Excluded Goal - Excluded Objective 1',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.DRAFT,
      },
      { individualHooks: true }
    )

    // create report
    report = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.DRAFT,
      userId: user.id,
      regionId: 1,
      lastUpdatedById: user.id,
      ECLKCResourcesUsed: ['test'],
      activityRecipients: [{ activityRecipientId: 30 }],
      version: 2,
    })

    // Create activity report objective
    await ActivityReportObjective.create({
      activityReportId: report.id,
      status: 'Complete',
      objectiveId: objective2.id,
      ttaProvided: 'Hogwash',
      supportType: SUPPORT_TYPES[3],
    })

    // create activity report goal
    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal.id,
      isActivelyEdited: false,
    })
  })
  afterAll(async () => {
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: report.id,
      },
    })

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: report.id,
      },
    })

    await Objective.destroy({
      where: {
        id: [objective1.id, objective2.id, excludeObjective.id],
      },
      force: true,
    })

    await Goal.destroy({
      where: {
        id: [goal.id, excludedGoal.id],
      },
      force: true,
    })

    await ActivityReport.destroy({
      where: {
        id: report.id,
      },
    })

    await User.destroy({
      where: {
        id: user.id,
      },
    })

    await sequelize.close()
  })
  it('returns the correct number of goals and objectives', async () => {
    const goalsForReport = await getGoalsForReport(report.id)
    expect(goalsForReport).toHaveLength(1)
    expect(goalsForReport[0].objectives).toHaveLength(1)
    expect(goalsForReport[0].objectives[0].id).toBe(objective2.id)
    expect(goalsForReport[0].objectives[0].ttaProvided).toBe('Hogwash')
    expect(goalsForReport[0].objectives[0].supportType).toBe(SUPPORT_TYPES[3])
  })
})
