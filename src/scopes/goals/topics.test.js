import { Op, filtersToScopes, Goal, sequelize, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('goals/topics', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
    await sequelize.close()
  })

  it('filters in by topics', async () => {
    const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' }
    const { goal: scope } = await filtersToScopes(filters)
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
    expect(found.map((g) => g.name)).toContain('Goal 2')
  })

  it('filters in by topics and recipient', async () => {
    const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' }
    const { goal: scope } = await filtersToScopes(filters, {
      goal: {
        recipientId: sharedTestData.topicsGrant.recipientId,
      },
    })
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
    expect(found.map((g) => g.name)).toContain('Goal 2')
  })

  it('filters out by topics', async () => {
    const filters = { 'topic.nin': 'Behavioral / Mental Health / Trauma' }
    const { goal: scope } = await filtersToScopes(filters)
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
    expect(found.map((g) => g.name)).not.toContain('Goal 2')
  })

  it('filters out by topics and recipient', async () => {
    const filters = { 'topic.nin': 'Behavioral / Mental Health / Trauma' }
    const { goal: scope } = await filtersToScopes(filters, {
      goal: {
        recipientId: sharedTestData.topicsGrant.recipientId,
      },
    })
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
    expect(found.map((g) => g.name)).not.toContain('Goal 2')
  })
})
