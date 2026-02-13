import { Op, filtersToScopes, Goal, sequelize, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('goals/goalType', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
    await sequelize.close()
  })

  describe('withGoalType', () => {
    it('RTTAPA', async () => {
      const filters = { 'goalType.in': 'RTTAPA' }
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

      expect(found.length).toBe(2)
      const names = found.map((f) => f.name)
      expect(names).toContain('Goal 1')
      expect(names).toContain('Goal 2')
    })
    it('no', async () => {
      const filters = { 'goalType.in': 'Non-RTTAPA' }
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

      expect(found.length).toBe(2)
      const names = found.map((f) => f.name)
      expect(names).toContain('Goal 3')
      expect(names).toContain('Goal 4')
    })

    it('other', async () => {
      const filters = { 'goalType.in': 'false' }
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

      expect(sharedTestData.possibleGoalIds.length).toBe(7)
      expect(found.length).toBe(7)
    })
  })

  describe('withoutRttapa', () => {
    it('yes', async () => {
      const filters = { 'goalType.nin': 'RTTAPA' }
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

      expect(found.length).toBe(5)
      const names = found.map((f) => f.name)
      expect(names).not.toContain('Goal 1')
      expect(names).not.toContain('Goal 2')
    })
    it('no', async () => {
      const filters = { 'goalType.nin': 'Non-RTTAPA' }
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

      expect(found.length).toBe(5)
      const names = found.map((f) => f.name)
      expect(names).not.toContain('Goal 3')
      expect(names).not.toContain('Goal 4')
    })

    it('other', async () => {
      const filters = { 'goalType.nin': 'false' }
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

      expect(sharedTestData.possibleGoalIds.length).toBe(7)
      expect(found.length).toBe(7)
    })
  })
})
