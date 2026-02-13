import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportApprover,
  submittedReport,
  approverApproved,
  approverRejected,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('calculatedStatus filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('calculatedStatus', () => {
    let includedReportMultApprover
    let excludedReportMultApprover
    let possibleIds

    beforeAll(async () => {
      includedReportMultApprover = await ActivityReport.create(submittedReport)
      await ActivityReportApprover.create({
        ...approverApproved,
        activityReportId: includedReportMultApprover.id,
      })

      excludedReportMultApprover = await ActivityReport.create(submittedReport)
      await ActivityReportApprover.create({
        ...approverRejected,
        activityReportId: excludedReportMultApprover.id,
      })
      possibleIds = [includedReportMultApprover.id, excludedReportMultApprover.id, sharedTestData.globallyExcludedReport.id]
    })

    it('includes statuses with a partial match', async () => {
      const filters = { 'calculatedStatus.in': ['approved'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReportMultApprover.id]))
    })

    it('excludes statuses that do not partial match', async () => {
      const filters = { 'calculatedStatus.nin': ['app'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([excludedReportMultApprover.id, sharedTestData.globallyExcludedReport.id]))
    })
  })
})
