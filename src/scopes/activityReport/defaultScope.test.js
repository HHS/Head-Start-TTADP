import { ActivityReport, deletedReport, setupSharedTestData, tearDownSharedTestData } from './testHelpers'

describe('defaultScope filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('defaultScope', () => {
    it('excludes deleted reports', async () => {
      const beginningARCount = await ActivityReport.count()
      const deleted = await ActivityReport.create(deletedReport)
      expect(deleted.id).toBeDefined()
      const endARCount = await ActivityReport.count()
      expect(endARCount).toEqual(beginningARCount)
    })
  })
})
