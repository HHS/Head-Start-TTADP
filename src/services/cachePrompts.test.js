import faker from '@faker-js/faker'
import crypto from 'crypto'
import db from '../models'
import { cachePrompts } from './reportCache'
import { AUTOMATIC_CREATION } from '../constants'
import { createReport, destroyReport } from '../testUtils'

const {
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Grant,
  Recipient,
  sequelize,
} = db

describe('cachePrompts', () => {
  let promptResponses
  let template
  let goalId
  let grant
  let recipient
  let promptId
  let promptTitle
  let report
  let activityReportGoalId

  beforeAll(async () => {
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 56000 }),
      name: faker.datatype.string(20),
    })

    grant = await Grant.create({
      regionId: 2,
      status: 'Active',
      id: faker.datatype.number({ min: 56000 }),
      number: faker.datatype.string(255),
      recipientId: recipient.id,
    })

    const n = faker.lorem.sentence(5)

    const secret = 'secret'
    const hash = crypto.createHmac('md5', secret).update(n).digest('hex')

    template = await GoalTemplate.create({
      hash,
      templateName: n,
      creationMethod: AUTOMATIC_CREATION,
    })

    promptTitle = faker.datatype.string(255)

    const prompt = await GoalTemplateFieldPrompt.create({
      goalTemplateId: template.id,
      ordinal: 1,
      title: promptTitle,
      prompt: promptTitle,
      hint: '',
      options: ['option 1', 'option 2', 'option 3'],
      fieldType: 'multiselect',
      validations: {
        required: 'Select a root cause',
        rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }],
      },
    })

    promptId = prompt.id

    promptResponses = [{ promptId: prompt.id, response: ['option 1', 'option 2'] }]

    const goal = await Goal.create({
      grantId: grant.id,
      goalTemplateId: template.id,
      name: n,
    })

    goalId = goal.id

    report = await createReport({
      activityRecipients: [
        {
          grantId: grant.id,
        },
      ],
    })

    const arg = await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal.id,
    })

    activityReportGoalId = arg.id
  })

  afterAll(async () => {
    await ActivityReportGoalFieldResponse.destroy({ where: { activityReportGoalId } })
    await ActivityReportGoal.destroy({ where: { activityReportId: report.id } })
    await destroyReport(report)
    await GoalFieldResponse.destroy({ where: { goalId } })
    await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id } })
    await Goal.destroy({ where: { goalTemplateId: template.id }, force: true })
    await GoalTemplate.destroy({ where: { id: template.id } })
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true })
    await Recipient.destroy({ where: { id: recipient.id } })
    await sequelize.close()
  })

  it('should cache prompts', async () => {
    // create
    await cachePrompts(goalId, activityReportGoalId, promptResponses)

    const cachedPrompts = await ActivityReportGoalFieldResponse.findAll({
      where: { activityReportGoalId },
    })

    expect(cachedPrompts.length).toBe(1)
    const cachedPrompt = cachedPrompts[0]
    expect(cachedPrompt.goalTemplateFieldPromptId).toBe(promptId)
    expect(cachedPrompt.response).toStrictEqual(['option 1', 'option 2'])

    // update
    await cachePrompts(goalId, activityReportGoalId, [{ promptId, response: ['option 1'] }])

    const updatedCachedPrompts = await ActivityReportGoalFieldResponse.findAll({
      where: { activityReportGoalId },
    })

    expect(updatedCachedPrompts.length).toBe(1)
    const updatedCachedPrompt = updatedCachedPrompts[0]
    expect(updatedCachedPrompt.goalTemplateFieldPromptId).toBe(promptId)
    expect(updatedCachedPrompt.response).toStrictEqual(['option 1'])

    // now remove and confirm they are gone
    await cachePrompts(goalId, activityReportGoalId, [])

    const removedCachedPrompts = await ActivityReportGoalFieldResponse.findAll({
      where: { activityReportGoalId },
    })

    expect(removedCachedPrompts.length).toBe(0)
  })
})
