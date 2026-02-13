import {
  Op,
  filtersToScopes,
  ActivityReport,
  draftReport,
  formatDeliveryMethod,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('delivery method filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('delivery method', () => {
    let includedReport1
    let includedReport2
    let excludedReport
    let possibleIds

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({ ...draftReport, deliveryMethod: 'in-person' })
      includedReport2 = await ActivityReport.create({ ...draftReport, deliveryMethod: 'in-person' })
      excludedReport = await ActivityReport.create({ ...draftReport, deliveryMethod: 'hybrid' })
      possibleIds = [includedReport1.id, includedReport2.id, excludedReport.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      })
    })

    describe('formatDeliveryMethod', () => {
      it('returns in-person for "in person"', () => {
        expect(formatDeliveryMethod('in person')).toBe('in-person')
      })
    })

    it('includes delivery method', async () => {
      const filters = { 'deliveryMethod.in': ['in-person'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]))
    })

    it('includes multiple delivery methods', async () => {
      const filters = { 'deliveryMethod.in': ['in-person', 'hybrid'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(3)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id, excludedReport.id]))
    })

    it('excludes delivery method', async () => {
      const filters = { 'deliveryMethod.nin': ['in-person'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]))
    })

    it('excludes multiple delivery method', async () => {
      const filters = { 'deliveryMethod.nin': ['in-person', 'hybrid'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([sharedTestData.globallyExcludedReport.id]))
    })
  })
})
