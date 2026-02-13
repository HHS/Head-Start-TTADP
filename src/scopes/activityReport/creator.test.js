/* eslint-disable max-len */
import { Op, filtersToScopes, ActivityReport, draftReport, setupSharedTestData, tearDownSharedTestData, sharedTestData } from './testHelpers'

describe('creator filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('creator', () => {
    let includedReport1
    let includedReport2
    let excludedReport
    let possibleIds

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.includedUser1.id,
      })
      includedReport2 = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.includedUser2.id,
      })
      excludedReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.excludedUser.id,
      })
      possibleIds = [includedReport1.id, includedReport2.id, excludedReport.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      })
    })

    it('includes authors with a partial match', async () => {
      const filters = { 'creator.ctn': ['person'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]))
    })

    it('trims the string', async () => {
      const filters = { 'creator.ctn': [' person '] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]))
    })

    it('excludes authors that do not partial match', async () => {
      const filters = { 'creator.nctn': ['person'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]))
    })
  })
})
