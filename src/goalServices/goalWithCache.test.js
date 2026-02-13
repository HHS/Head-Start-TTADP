import faker from '@faker-js/faker'
import { REPORT_STATUSES } from '@ttahub/common'
import crypto from 'crypto'
import { CURATED_CREATION } from '../constants'
import { saveStandardGoalsForReport } from '../services/standardGoals'
import db, {
  User,
  Goal,
  Grant,
  ActivityReportGoal,
  Recipient,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  ActivityReportGoalFieldResponse,
  GoalTemplate,
} from '../models'
import { createReport, destroyReport } from '../testUtils'
import goal from '../models/goal'

const mockUser = {
  id: faker.datatype.number({ min: 9999 }),
  homeRegionId: 1,
  name: 'user942571',
  hsesUsername: 'user942571',
  hsesUserId: '942571',
  lastLogin: new Date(),
}

describe('saveGoalsForReport multi recipient', () => {
  // User.
  let user

  // Template.
  let goalTemplate
  const templateName = 'One template to rule them all'

  // Recipients.
  let multiRecipientRecipientA
  let multiRecipientRecipientB

  // Grants.
  let multiRecipientGrantOneA
  let multiRecipientGrantOneB
  let multiRecipientGrantTwo

  // Activity Reports.
  let multiRecipientActivityReport

  // Goals.
  let multiRecipientGoalOneA
  let multiRecipientGoalOneB
  let multiRecipientGoalTwo

  // FEI Prompt.
  let fieldPrompt

  beforeAll(async () => {
    // Create user.
    user = await User.create(mockUser)

    // Create goal template.
    const secret = 'secret'
    const hash = crypto.createHmac('md5', secret).update(templateName).digest('hex')

    goalTemplate = await GoalTemplate.create({
      hash,
      templateName,
      creationMethod: CURATED_CREATION,
    })

    // Create recipients.
    multiRecipientRecipientA = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.company.companyName(),
      uei: 'NNA5N2KHMGN2',
    })

    multiRecipientRecipientB = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.company.companyName(),
      uei: 'NNA5N2KHMGN2',
    })

    // Create grants.
    multiRecipientGrantOneA = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: multiRecipientRecipientA.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    })

    multiRecipientGrantOneB = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: multiRecipientRecipientA.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    })

    multiRecipientGrantTwo = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: multiRecipientRecipientB.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    })

    // Create activity report.
    multiRecipientActivityReport = await createReport({
      status: REPORT_STATUSES.DRAFT,
      activityRecipients: [
        {
          grantId: multiRecipientGrantOneA.id,
        },
        {
          grantId: multiRecipientGrantOneB.id,
        },
        {
          grantId: multiRecipientGrantTwo.id,
        },
      ],
    })

    // Create goals.
    multiRecipientGoalOneA = await Goal.create({
      name: 'One fei goal to rule them all',
      status: 'Draft',
      grantId: multiRecipientGrantOneA.id,
      goalTemplateId: goalTemplate.id,
    })

    multiRecipientGoalOneB = await Goal.create({
      name: 'One fei goal to rule them all',
      status: 'Draft',
      grantId: multiRecipientGrantOneB.id,
      goalTemplateId: goalTemplate.id,
    })

    multiRecipientGoalTwo = await Goal.create({
      name: 'One fei goal to rule them all',
      status: 'Draft',
      grantId: multiRecipientGrantTwo.id,
      goalTemplateId: goalTemplate.id,
    })

    // find 'FEI root cause' field prompt.
    fieldPrompt = await GoalTemplateFieldPrompt.findOne({
      where: {
        title: 'FEI root cause',
      },
    })

    // Create GoalFieldResponses.
    await GoalFieldResponse.create({
      goalId: multiRecipientGoalOneA.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: ['Family Circumstance', 'Facilities', 'Other ECE Care Options'],
      onAr: true,
      onApprovedAR: false,
    })

    await GoalFieldResponse.create({
      goalId: multiRecipientGoalOneB.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: [],
      onAr: true,
      onApprovedAR: false,
    })

    await GoalFieldResponse.create({
      goalId: multiRecipientGoalTwo.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: ['Facilities'],
      onAr: true,
      onApprovedAR: false,
    })
  })

  afterAll(async () => {
    // Get all ActivityReportGoals.
    const activityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
      },
    })
    const activityReportGoalIds = activityReportGoals.map((arg) => arg.id)

    // Delete ActivityReportFieldResponses.
    await ActivityReportGoalFieldResponse.destroy({
      where: {
        activityReportGoalId: activityReportGoalIds,
      },
      individualHooks: true,
    })

    // Delete ActivityReportGoals.
    await ActivityReportGoal.destroy({
      where: {
        id: activityReportGoalIds,
      },
      individualHooks: true,
    })

    // Delete GoalFieldResponses.
    await GoalFieldResponse.destroy({
      where: {
        goalId: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
      },
      individualHooks: true,
    })

    // Delete Goals.
    await Goal.destroy({
      where: {
        id: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
      },
      individualHooks: true,
      force: true,
    })

    // Delete ActivityReport.
    // await ActivityReport.destroy({
    //   where: {
    //     id: multiRecipientActivityReport.id,
    //   },
    //   individualHooks: true,
    // });
    await destroyReport(multiRecipientActivityReport)

    // Delete Grants.
    await Grant.destroy({
      where: {
        id: [multiRecipientGrantOneA.id, multiRecipientGrantOneB.id, multiRecipientGrantTwo.id],
      },
      individualHooks: true,
    })

    // Delete Recipients.
    await Recipient.destroy({
      where: {
        id: [multiRecipientRecipientA.id, multiRecipientRecipientB.id],
      },
      individualHooks: true,
    })

    // Delete GoalTemplate.
    await GoalTemplate.destroy({
      where: {
        id: goalTemplate.id,
      },
      individualHooks: true,
    })

    // Delete User.
    await User.destroy({
      where: {
        id: user.id,
      },
      individualHooks: true,
    })
    await db.sequelize.close()
  })

  it('correctly updates multi recipient report root causes per grant', async () => {
    // call the function.
    await saveStandardGoalsForReport(
      [
        {
          name: 'One fei goal to rule them all',
          label: 'One fei goal to rule them all',
          isNew: false,
          goalTemplateId: goalTemplate.id,
          goalIds: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
          grantIds: [multiRecipientGrantOneA.id, multiRecipientGrantOneB.id, multiRecipientGrantTwo.id],
          status: 'In Progress',
          objectives: [],
          regionId: 1,
          source: 'Regional office priority',
          createdVia: 'activityReport',
        },
      ],
      user.id,
      { id: multiRecipientActivityReport.id }
    )

    // Retrieve ActivityReportGoals.
    const activityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
      },
    })
    const activityReportGoalIds = activityReportGoals.map((arg) => arg.id)

    // Retrieve ActivityReportGoalFieldResponses.
    let activityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: activityReportGoalIds,
      },
    })
    expect(activityReportGoalFieldResponses.length).toBe(3)

    // Check the response.
    const response = activityReportGoalFieldResponses.map((arg) => arg.response)
    expect(response).toContainEqual(['Family Circumstance', 'Facilities', 'Other ECE Care Options'])
    expect(response).toContainEqual([])
    expect(response).toContainEqual(['Facilities'])

    // call the function.
    await saveStandardGoalsForReport(
      [
        {
          name: 'One fei goal to rule them all',
          label: 'One fei goal to rule them all',
          isNew: false,
          goalIds: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
          goalTemplateId: goalTemplate.id,
          grantIds: [multiRecipientGrantOneA.id, multiRecipientGrantOneB.id, multiRecipientGrantTwo.id],
          status: 'In Progress',
          objectives: [],
          regionId: 1,
          source: 'Regional office priority',
          createdVia: 'activityReport',
          prompts: [
            {
              grantId: multiRecipientGrantOneA.id,
              response: ['Workforce'],
              promptId: fieldPrompt.id,
            },
            {
              grantId: multiRecipientGrantOneB.id,
              response: ['Other ECE Care Options', 'Unavailable'],
              promptId: fieldPrompt.id,
            },
            {
              grantId: multiRecipientGrantTwo.id,
              response: ['Community Partnerships'],
              promptId: fieldPrompt.id,
            },
          ],
        },
      ],
      user.id,
      { id: multiRecipientActivityReport.id }
    )

    activityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: activityReportGoalIds,
      },
    })
    expect(activityReportGoalFieldResponses.length).toBe(3)

    // We don't expect the responses to be updated in the ActivityReportGoalFieldResponses
    // from the GoalFieldResponses whe saving the AR.
    const updatedResponses = activityReportGoalFieldResponses.map((arg) => arg.response)
    expect(updatedResponses).toContainEqual(['Workforce'])
    expect(updatedResponses).toContainEqual(['Other ECE Care Options', 'Unavailable'])
    expect(updatedResponses).toContainEqual(['Community Partnerships'])

    // We do expect the goal field responses to be updated.
    const updatedGoalFieldResponses = await GoalFieldResponse.findAll({
      where: {
        goalId: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
      },
    })

    const goalFieldResponses = updatedGoalFieldResponses.map((arg) => arg.response)
    expect(goalFieldResponses).toContainEqual(['Workforce'])
    expect(goalFieldResponses).toContainEqual(['Other ECE Care Options', 'Unavailable'])
    expect(goalFieldResponses).toContainEqual(['Community Partnerships'])
  })
})
