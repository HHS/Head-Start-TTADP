import { Op, filtersToScopes, ActivityReport, draftReport, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('endDate filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('endDate', () => {
    let firstReport
    let secondReport
    let thirdReport
    let fourthReport
    let possibleIds

    beforeAll(async () => {
      firstReport = await ActivityReport.create({
        ...draftReport,
        id: 95842,
        endDate: new Date(2020, 8, 1),
      })
      secondReport = await ActivityReport.create({
        ...draftReport,
        id: 95843,
        endDate: new Date(2020, 8, 2),
      })
      thirdReport = await ActivityReport.create({
        ...draftReport,
        id: 95844,
        endDate: new Date(2020, 8, 3),
      })
      fourthReport = await ActivityReport.create({
        ...draftReport,
        id: 95845,
        endDate: new Date(2020, 8, 4),
      })
      possibleIds = [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      })
    })

    it('before returns reports with end dates before the given date', async () => {
      const filters = { 'endDate.bef': '2020/09/02' }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([firstReport.id, secondReport.id]))
    })

    it('after returns reports with end dates after the given date', async () => {
      const filters = { 'endDate.aft': '2020/09/04' }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([fourthReport.id]))
    })

    it('within returns reports with create dates between the two dates', async () => {
      const filters = { 'endDate.win': '2020/09/01-2020/09/03' }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(3)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([firstReport.id, secondReport.id, thirdReport.id]))
    })

    it('in returns reports with end dates between the two dates', async () => {
      const filters = { 'endDate.in': '2020/09/01-2020/09/03' }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(3)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([firstReport.id, secondReport.id, thirdReport.id]))
    })
  })
})
