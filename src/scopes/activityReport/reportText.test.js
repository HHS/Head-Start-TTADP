import { Op, filtersToScopes, ActivityReport, draftReport, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('reportText filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('reportText', () => {
    let includedReport1
    let includedReport2
    let excludedReport
    let possibleIds

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({
        ...draftReport,
        context: 'included text found in this report. Additional text.',
      })

      includedReport2 = await ActivityReport.create({
        ...draftReport,
        context: 'Additional text. included text found in this report.',
      })

      excludedReport = await ActivityReport.create({
        ...draftReport,
        context: 'excluded text in this report',
      })

      possibleIds = [includedReport1.id, includedReport2.id, excludedReport.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      })
    })

    it('includes reports with matching text', async () => {
      const filters = { 'reportText.ctn': ['included text'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]))
    })

    it('excludes reports with matching text', async () => {
      const filters = { 'reportText.nctn': ['included text'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id))
        // eslint-disable-next-line max-len
        .toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]))
    })
  })
})
