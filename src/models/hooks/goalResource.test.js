import { sequelize, Resource, Goal, GoalResource } from '..'

jest.mock('bull')

describe('goalResource hooks', () => {
  let resourceToDestroy
  let goalToDestroy

  beforeAll(async () => {
    // Create resource.
    resourceToDestroy = await Resource.create({ url: 'https://goal-resource-hook.gov' })

    // Create goal.
    goalToDestroy = await Goal.create({
      name: 'goal resource hook test',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: 1,
    })

    // Create goal resource.
    await GoalResource.create({
      goalId: goalToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
      onAR: false,
      onApprovedAR: false,
    })
  })

  afterAll(async () => {
    // Delete objective template resource.
    await GoalResource.destroy({
      where: { goalId: goalToDestroy.id },
      individualHooks: true,
    })

    // Delete objective template.
    await Goal.destroy({
      where: { id: goalToDestroy.id },
      individualHooks: true,
      force: true,
    })

    // Delete resource.
    await Resource.destroy({
      where: { id: [resourceToDestroy.id] },
      individualHooks: true,
    })

    // Close sequelize connection.
    await sequelize.close()
  })

  it('afterDestroy', async () => {
    // Verify goal resource resource exist's.
    let gr = await GoalResource.findOne({
      where: { goalId: goalToDestroy.id },
    })
    expect(gr).not.toBeNull()

    // Verify resource exists's.
    let resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } })
    expect(resource).not.toBeNull()

    // Delete with hooks.
    await GoalResource.destroy({
      where: { goalId: goalToDestroy.id },
      individualHooks: true,
    })

    // Verify goal resource deleted.
    gr = await GoalResource.findOne({
      where: { goalId: goalToDestroy.id },
    })
    expect(gr).toBeNull()

    // Verify resource was deleted.
    resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } })
    expect(resource).toBeNull()
  })
})
