import { Op } from 'sequelize'
import { createGrant } from '../../testUtils'
import filtersToScopes from '../index'
import { Goal, Grant, GoalTemplateFieldPrompt, GoalFieldResponse } from '../../models'
import grant from '../../models/grant'

describe('goal filtersToScopes', () => {
  describe('goalFieldResponse', () => {
    let prompt
    let goal1
    let goal2
    let goal3
    let response1
    let response2
    let response3
    let goalGrant

    beforeAll(async () => {
      goalGrant = await createGrant()

      prompt = await GoalTemplateFieldPrompt.findOne({
        where: { title: 'FEI root cause' },
      })

      goal1 = await Goal.create({
        name: 'Goal 6',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        createdAt: new Date('2021-01-20'),
        grantId: goalGrant.id,
        createdVia: 'rtr',
      })

      goal2 = await Goal.create({
        name: 'Goal 7',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        createdAt: new Date('2021-01-20'),
        grantId: goalGrant.id,
        createdVia: 'rtr',
      })

      goal3 = await Goal.create({
        name: 'Goal 8',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        createdAt: new Date('2021-01-20'),
        grantId: goalGrant.id,
        createdVia: 'rtr',
      })

      response1 = await GoalFieldResponse.create({
        goalId: goal1.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['Community Partnerships'],
      })

      response2 = await GoalFieldResponse.create({
        goalId: goal2.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['Workforce', 'Family circumstances'],
      })

      response3 = await GoalFieldResponse.create({
        goalId: goal3.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['Facilities'],
      })
    })

    afterAll(async () => {
      const idsToDelete = [response1?.id, response2?.id, response3?.id].filter(Boolean)

      if (idsToDelete.length > 0) {
        await GoalFieldResponse.destroy({ where: { id: idsToDelete } })
      }

      await Goal.destroy({
        where: {
          grantId: goalGrant.id,
        },
        individualHooks: true,
        force: true,
      })

      await Grant.destroy({
        where: {
          id: goalGrant.id,
        },
        individualHooks: true,
      })
    })

    it('finds goals with responses', async () => {
      const filters = { 'goalResponse.in': ['Workforce'] }
      const { goal: scope } = await filtersToScopes(filters, 'goal')
      const found = await Goal.findAll({
        where: { [Op.and]: [scope, { id: [goal1.id, goal2.id, goal3.id] }] },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([goal2.id]))
    })

    it('finds goals without responses', async () => {
      const filters = { 'goalResponse.nin': ['Workforce'] }
      const { goal: scope } = await filtersToScopes(filters, 'goal')
      const found = await Goal.findAll({
        where: { [Op.and]: [scope, { id: [goal1.id, goal2.id, goal3.id] }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([goal1.id, goal3.id]))
    })
  })
})
