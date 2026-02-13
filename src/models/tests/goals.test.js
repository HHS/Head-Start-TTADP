import db, { Recipient, Goal, GoalTemplate, Grant } from '..'
import { autoPopulateOnApprovedAR } from '../hooks/goal'

const mockRecipient = { id: 5001, name: 'Bobs Builders', uei: 'NNA5N2KHMGM2' }
const mockGrant = { id: 6001, number: '1234567890', regionId: 2 }
const mockGoal = { name: 'build a playground' }

describe('Goals', () => {
  describe('Goals', () => {
    let recipient
    let grant
    beforeAll(async () => {
      recipient = await Recipient.create({ ...mockRecipient })
      grant = await Grant.create({ ...mockGrant, recipientId: recipient.id })
    })
    afterAll(async () => {
      await Goal.destroy({ where: { grantId: grant.id }, force: true })
      await GoalTemplate.destroy({ where: { templateName: mockGoal.name } })
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true })
      await Recipient.destroy({ where: { id: recipient.id } })
      await db.sequelize.close()
    })
    it('goalNumber', async () => {
      const goal = await Goal.create({ ...mockGoal, grantId: grant.id })
      expect(goal.goalNumber).toEqual(`G-${goal.id}`)
      await Goal.destroy({ where: { id: goal.id }, force: true })
    })
  })
  it('autoPopulateOnApprovedAR', async () => {
    let instance = {}
    instance.set = (name, value) => {
      instance[name] = value
    }
    let options = { fields: [] }
    autoPopulateOnApprovedAR(null, instance, options)
    expect(instance.onApprovedAR).toEqual(false)

    instance = {
      onApprovedAR: false,
    }
    instance.set = (name, value) => {
      instance[name] = value
    }
    options = { fields: [] }
    autoPopulateOnApprovedAR(null, instance, options)
    expect(instance.onApprovedAR).toEqual(false)

    instance = {
      onApprovedAR: true,
    }
    instance.set = (name, value) => {
      instance[name] = value
    }
    options = { fields: [] }
    autoPopulateOnApprovedAR(null, instance, options)
    expect(instance.onApprovedAR).toEqual(true)
  })
})
