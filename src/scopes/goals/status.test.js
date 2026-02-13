import {
  Op,
  filtersToScopes,
  Goal,
  sequelize,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
  withStatus,
  withoutStatus,
} from './testHelpers'

describe('goals/status', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
    await sequelize.close()
  })

  it('filters in by status', async () => {
    const filters = { 'status.in': ['In Progress', 'Needs status'] }
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
    expect(found.map((g) => g.name)).toContain('Goal 3')
  })
  it('filters out by status', async () => {
    const filters = { 'status.nin': ['Suspended'] }
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

    expect(found.length).toBe(5)
    expect(found.map((g) => g.name)).toContain('Goal 1')
    expect(found.map((g) => g.name)).toContain('Goal 2')
    expect(found.map((g) => g.name)).toContain('Goal 3')
    expect(found.map((g) => g.name)).toContain('Goal 4')
  })

  it('withStatus, when statuses does not include Needs status', () => {
    const out = withStatus([])
    expect(out).toMatchObject({
      [Op.or]: [],
    })
  })

  it('withoutStatus, when status includes Needs status', () => {
    const out = withoutStatus(['Needs status'])
    expect(out).toMatchObject({
      [Op.or]: [
        {
          [Op.and]: [{ status: { [Op.notILike]: '%Needs status%' } }],
        },
        {
          status: { [Op.not]: null },
        },
      ],
    })
  })
})
