import { Op, filtersToScopes, Goal, sequelize, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('goals/reasons', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
    await sequelize.close()
  })

  it('filters by reason', async () => {
    const filters = { 'reason.in': 'Full Enrollment' }
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
    expect(found.map((g) => g.name)).toContain('Goal 1')
  })
  it('filters by reason with recipient', async () => {
    const filters = { 'reason.in': 'Full Enrollment' }
    const { goal: scope } = await filtersToScopes(filters, {
      goal: {
        recipientId: sharedTestData.reasonsGrant.recipientId,
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
    expect(found.map((g) => g.name)).toContain('Goal 1')
  })
  it('filters out by reason', async () => {
    const filters = { 'reason.nin': 'Full Enrollment' }
    const { goal: scope } = await filtersToScopes(filters)
    const found = await Goal.findAll({
      where: {
        [Op.and]: [scope, { id: sharedTestData.possibleGoalIds }],
      },
    })

    expect(found.length).toBe(6)
    expect(found.map((g) => g.name)).not.toContain('Goal 1')
  })
  it('filters out by reason with recipient', async () => {
    const filters = { 'reason.nin': 'Full Enrollment' }
    const { goal: scope } = await filtersToScopes(filters, {
      goal: {
        recipientId: sharedTestData.reasonsGrant.recipientId,
      },
    })
    const found = await Goal.findAll({
      where: {
        [Op.and]: [scope, { id: sharedTestData.possibleGoalIds }],
      },
    })

    expect(found.length).toBe(6)
    expect(found.map((g) => g.name)).not.toContain('Goal 1')
  })
})
