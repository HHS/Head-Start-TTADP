import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityRecipient,
  Grant,
  Group,
  GroupGrant,
  GroupCollaborator,
  draftReport,
  createGrant,
  faker,
  mockUser,
  mockUserTwo,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('groups filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('groups', () => {
    let reportIncluded
    let reportExcluded
    let possibleIds

    let group
    let publicGroup
    let grant

    beforeAll(async () => {
      group = await Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        isPublic: false,
      })

      await GroupCollaborator.create({
        groupId: group.id,
        userId: mockUser.id,
        collaboratorTypeId: 1,
      })

      publicGroup = await Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        isPublic: true,
      })

      await GroupCollaborator.create({
        groupId: publicGroup.id,
        userId: mockUserTwo.id,
        collaboratorTypeId: 1,
      })

      grant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
      })

      await GroupGrant.create({
        groupId: group.id,
        grantId: grant.id,
      })

      await GroupGrant.create({
        groupId: publicGroup.id,
        grantId: grant.id,
      })

      reportIncluded = await ActivityReport.create({ ...draftReport })
      reportExcluded = await ActivityReport.create({ ...draftReport })

      await ActivityRecipient.create({
        activityReportId: reportIncluded.id,
        grantId: grant.id,
      })

      possibleIds = [reportIncluded.id, reportExcluded.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          activityReportId: [reportIncluded.id, reportExcluded.id],
        },
      })
      await ActivityReport.destroy({
        where: { id: [reportIncluded.id, reportExcluded.id] },
      })
      await GroupGrant.destroy({
        where: { groupId: [group.id, publicGroup.id] },
      })

      await GroupCollaborator.destroy({
        where: { groupId: [group.id, publicGroup.id] },
      })

      await Group.destroy({
        where: { id: [group.id, publicGroup.id] },
      })
      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      })
    })

    it('filters by group', async () => {
      const filters = { 'group.in': [String(group.id)] }
      const scope = await filtersToScopes(filters, { userId: mockUser.id })
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      const groupIds = found.map((f) => f.id)
      expect(groupIds).toContain(reportIncluded.id)
    })

    it('filters by public group', async () => {
      const filters = { 'group.in': [String(publicGroup.id)] }
      const scope = await filtersToScopes(filters, { userId: mockUser.id })
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      const groupIds = found.map((f) => f.id)
      expect(groupIds).toContain(reportIncluded.id)
    })

    it('filters out by group', async () => {
      const filters = { 'group.nin': [String(group.id)] }
      const scope = await filtersToScopes(filters, { userId: mockUser.id })
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      const foundIds = found.map((f) => f.id)
      expect(foundIds).toContain(reportExcluded.id)
      expect(foundIds).toContain(sharedTestData.globallyExcludedReport.id)
    })

    it('filters out by public group', async () => {
      const filters = { 'group.nin': [String(publicGroup.id)] }
      const scope = await filtersToScopes(filters, { userId: mockUser.id })
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope.activityReport, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      const foundIds = found.map((f) => f.id)
      expect(foundIds).toContain(reportExcluded.id)
      expect(foundIds).toContain(sharedTestData.globallyExcludedReport.id)
    })
  })
})
