import addMonitoringGoalForGrant from './addMonitoringGoalForGrant'
import { Goal, GoalStatusChange, GoalTemplate, Grant, Recipient, sequelize } from '../models'
import { getUniqueId } from '../testUtils'

describe('addMonitoringGoalForGrant', () => {
  let grant
  let goalTemplate
  let goalId
  let transaction

  beforeAll(async () => {
    goalTemplate = await GoalTemplate.findOne({
      where: { standard: 'Monitoring' },
      order: [['id', 'DESC']],
      paranoid: false,
    })
    if (!goalTemplate) {
      throw new Error('Monitoring GoalTemplate not found in test DB')
    }

    transaction = await sequelize.transaction()
    const recipientId = getUniqueId()
    const grantId = getUniqueId()

    await Recipient.create(
      {
        id: recipientId,
        name: `Test Recipient ${recipientId}`,
        uei: 'NNA5N2KHMGN2',
      },
      { transaction }
    )

    grant = await Grant.create(
      {
        id: grantId,
        number: `TEST${grantId}`,
        regionId: 10,
        status: 'Active',
        startDate: new Date('2021/01/01'),
        endDate: new Date(),
        recipientId,
      },
      { transaction }
    )
  })

  afterAll(async () => {
    if (transaction) {
      await transaction.rollback()
    }
  })

  it('creates a monitoring goal and initial status change', async () => {
    goalId = await addMonitoringGoalForGrant(grant.id, transaction)

    const goal = await Goal.findByPk(goalId, { paranoid: false, transaction })
    expect(goal).toBeDefined()
    expect(goal.grantId).toBe(grant.id)
    expect(goal.goalTemplateId).toBe(goalTemplate.id)
    expect(goal.status).toBe('Not Started')
    expect(goal.createdVia).toBe('monitoring')

    const statusChange = await GoalStatusChange.findOne({
      where: { goalId, newStatus: 'Not Started' },
      transaction,
    })
    expect(statusChange).toBeDefined()
    expect(statusChange.reason).toBe('Goal created')
    expect(statusChange.context).toBe('Creation')
  })

  it('does not create a duplicate open monitoring goal', async () => {
    const sameGoalId = await addMonitoringGoalForGrant(grant.id, transaction)
    expect(sameGoalId).toBe(goalId)

    const goals = await Goal.findAll({
      where: {
        grantId: grant.id,
        goalTemplateId: goalTemplate.id,
      },
      paranoid: false,
      transaction,
    })
    expect(goals).toHaveLength(1)
  })
})
