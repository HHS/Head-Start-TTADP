import { Op, filtersToScopes, ActivityReport, approvedReport, setupSharedTestData, tearDownSharedTestData } from './testHelpers'

describe('participants filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('participants', () => {
    let possibleIds
    let reportOne
    let reportTwo
    let reportThree
    let reportFour

    beforeAll(async () => {
      reportOne = await ActivityReport.create({
        ...approvedReport,
        participants: ['Fiscal Manager/Team', 'Coach'],
      })
      reportTwo = await ActivityReport.create({
        ...approvedReport,
        participants: ['HSCO', 'Regional TTA Team / Specialists'],
      })
      reportThree = await ActivityReport.create({ ...approvedReport, participants: ['Coach'] })
      reportFour = await ActivityReport.create({ ...approvedReport, participants: [] })

      possibleIds = [reportOne.id, reportTwo.id, reportThree.id, reportFour.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      })
    })

    it('returns reports with a specific participant', async () => {
      const filters = { 'participants.in': ['Coach'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })

      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportOne.id, reportThree.id]))
    })

    it('returns reports without a specific participiant', async () => {
      const filters = { 'participants.nin': ['Coach'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportTwo.id, reportFour.id]))
    })

    it('only searches by allowed participiant', async () => {
      const filters = { 'participants.in': ['invalid participant'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })

      expect(found.length).toBe(4)
    })
  })
})
