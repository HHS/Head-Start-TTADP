/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityRecipient,
  OtherEntity,
  draftReport,
  mockUser,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('only other entities filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('only other entities', () => {
    let reportIncluded1
    let reportExcluded
    let reportIncluded2

    let otherEntityIncluded1
    let otherEntityIncluded2
    let otherEntityExcluded

    let possibleIds

    beforeAll(async () => {
      otherEntityIncluded1 = await OtherEntity.create({
        id: 25458,
        name: 'Head Start Collaboration Office',
      })
      otherEntityExcluded = await OtherEntity.create({ id: 25459, name: 'QRIS System' })
      otherEntityIncluded2 = await OtherEntity.create({ id: 25460, name: 'State CCR&R' })

      reportIncluded1 = await ActivityReport.create({ userId: mockUser.id, ...draftReport })
      reportIncluded2 = await ActivityReport.create({ userId: mockUser.id, ...draftReport })
      reportExcluded = await ActivityReport.create({ userId: mockUser.id, ...draftReport })

      await ActivityRecipient.create({
        activityReportId: reportIncluded1.id,
        otherEntityId: otherEntityIncluded1.id,
      })
      await ActivityRecipient.create({
        activityReportId: reportExcluded.id,
        otherEntityId: otherEntityExcluded.id,
      })
      await ActivityRecipient.create({
        activityReportId: reportIncluded2.id,
        otherEntityId: otherEntityIncluded2.id,
      })

      possibleIds = [reportIncluded1.id, reportIncluded2.id, reportExcluded.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          activityReportId: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id],
        },
      })
      await ActivityReport.destroy({
        where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
      })
      await OtherEntity.destroy({
        where: { id: [otherEntityIncluded1.id, otherEntityIncluded2.id, otherEntityExcluded.id] },
      })
    })

    it('includes other entities', async () => {
      const filters = { 'otherEntities.in': ['Head Start Collaboration Office', 'State CCR&R'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]))
    })

    it('excludes other entities', async () => {
      const filters = { 'otherEntities.nin': ['Head Start Collaboration Office', 'State CCR&R'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportExcluded.id, sharedTestData.globallyExcludedReport.id]))
    })
  })
})
