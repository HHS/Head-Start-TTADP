import { Op, filtersToScopes, ActivityReport, draftReport, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('reportId filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('reportId', () => {
    let reportIncluded
    let reportIncludedLegacy
    let reportExcluded
    let possibleIds

    beforeAll(async () => {
      reportIncluded = await ActivityReport.create({ ...draftReport, id: 12345 })
      reportIncludedLegacy = await ActivityReport.create({
        ...draftReport,
        legacyId: 'R01-AR-012345',
      })
      reportExcluded = await ActivityReport.create({ ...draftReport, id: 12346 })
      possibleIds = [reportIncluded.id, reportIncludedLegacy.id, reportExcluded.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [reportIncluded.id, reportIncludedLegacy.id, reportExcluded.id] },
      })
    })

    it('included has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.ctn': ['12345'] }
      const scope = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportIncluded.id, reportIncludedLegacy.id]))
    })

    it('excluded has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.nctn': ['12345'] }
      const scope = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([sharedTestData.globallyExcludedReport.id, reportExcluded.id]))
    })
  })
})
