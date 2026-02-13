import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportCollaborator,
  draftReport,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('specialistName filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('specialistName', () => {
    let includeCollaboratorReport
    let includeCreatorReport
    let excludedReport
    let possibleIds

    let includedActivityReportCollaborator1
    let includedActivityReportCollaborator2
    let excludedActivityReportCollaborator

    beforeAll(async () => {
      // Collaborator report.
      includeCollaboratorReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.includedUser3.id,
      })

      // Creator report.
      includeCreatorReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.includedUser2.id,
      })

      // Exclude report.
      excludedReport = await ActivityReport.create(draftReport)

      // Collaborators.
      includedActivityReportCollaborator1 = await ActivityReportCollaborator.create({
        activityReportId: includeCollaboratorReport.id,
        userId: sharedTestData.includedUser1.id,
      })

      includedActivityReportCollaborator2 = await ActivityReportCollaborator.create({
        activityReportId: includeCreatorReport.id,
        userId: sharedTestData.includedUser3.id,
      })

      excludedActivityReportCollaborator = await ActivityReportCollaborator.create({
        activityReportId: excludedReport.id,
        userId: sharedTestData.excludedUser.id,
      })
      possibleIds = [includeCollaboratorReport.id, includeCreatorReport.id, excludedReport.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includeCollaboratorReport.id, includeCreatorReport.id, excludedReport.id] },
      })
      await ActivityReportCollaborator.destroy({
        where: {
          id: [includedActivityReportCollaborator1.id, includedActivityReportCollaborator2.id, excludedActivityReportCollaborator.id],
        },
      })
    })

    it('finds the report by collaborator', async () => {
      const filters = { 'specialistName.collaborator': [sharedTestData.includedUser1.name] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includeCollaboratorReport.id, includeCreatorReport.id]))
    })

    it('finds the report by creator', async () => {
      const filters = { 'specialistName.creator': [sharedTestData.includedUser2.name] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includeCreatorReport.id]))
    })

    it('finds the report by both', async () => {
      const filters = { 'specialistName.both': [sharedTestData.includedUser3.name] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includeCollaboratorReport.id, includeCreatorReport.id]))
    })
  })
})
