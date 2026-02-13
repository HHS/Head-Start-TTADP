import { Op, filtersToScopes, Goal, sequelize, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('goals/grantNumber', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
    await sequelize.close()
  })

  it('withGrantNumber', async () => {
    const filters = { 'grantNumber.in': sharedTestData.otherGrant.number }
    const { goal: scope } = await filtersToScopes(filters, 'goal')
    const found = await Goal.findAll({
      where: {
        [Op.and]: [
          scope,
          {
            id: sharedTestData.possibleGoalIds,
          },
        ],
      },
    })

    expect(found.length).toBe(1)
    expect(found[0].name).toContain('Goal 7')
  })

  it('withoutGrantNumber', async () => {
    const filters = { 'grantNumber.nin': sharedTestData.otherGrant.number }
    const { goal: scope } = await filtersToScopes(filters, 'goal')
    const found = await Goal.findAll({
      where: {
        [Op.and]: [
          scope,
          {
            id: sharedTestData.possibleGoalIds,
          },
        ],
      },
    })

    expect(found.length).toBe(6)
    expect(found[0].name).not.toContain('Goal 7')
  })
})
