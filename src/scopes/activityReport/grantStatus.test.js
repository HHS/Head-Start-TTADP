import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityRecipient,
  Grant,
  Recipient,
  draftReport,
  createGrant,
  faker,
  mockUser,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers'

describe('grantStatus filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('grantStatus', () => {
    let cdiReportActive
    let cdiReportInactive
    let nonCdiReportActive
    let nonCdiReportInactive
    let activeCdiGrant
    let inactiveCdiGrant
    let nonCdiGrantActive
    let nonCdiGrantInactive
    let reportIds

    beforeAll(async () => {
      // Grants.
      activeCdiGrant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: true,
      })

      inactiveCdiGrant = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Inactive',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: true,
      })

      nonCdiGrantActive = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Active',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: false,
      })

      nonCdiGrantInactive = await createGrant({
        userId: mockUser.id,
        regionId: 1,
        status: 'Inactive',
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        cdi: false,
      })

      // Activity Report.
      cdiReportActive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true })

      cdiReportInactive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true })

      nonCdiReportActive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true })

      nonCdiReportInactive = await ActivityReport.create({ ...draftReport, updatedAt: '2020-01-01' }, { silent: true })

      reportIds = [cdiReportActive.id, cdiReportInactive.id, nonCdiReportActive.id, nonCdiReportInactive.id]

      // Activity Recipients.
      await ActivityRecipient.create({
        activityReportId: cdiReportActive.id,
        grantId: activeCdiGrant.id,
      })

      await ActivityRecipient.create({
        activityReportId: cdiReportInactive.id,
        grantId: inactiveCdiGrant.id,
      })

      await ActivityRecipient.create({
        activityReportId: nonCdiReportActive.id,
        grantId: nonCdiGrantActive.id,
      })

      await ActivityRecipient.create({
        activityReportId: nonCdiReportInactive.id,
        grantId: nonCdiGrantInactive.id,
      })
    })

    afterAll(async () => {
      // Clean up ActivityRecipients.
      await ActivityRecipient.destroy({
        where: {
          activityReportId: reportIds,
        },
      })

      // Clean up ActivityReport.
      await ActivityReport.destroy({
        where: { id: reportIds },
      })

      // Clean up Grants.
      await Grant.destroy({
        where: {
          id: [activeCdiGrant.id, inactiveCdiGrant.id, nonCdiGrantActive.id, nonCdiGrantInactive.id],
        },
        individualHooks: true, // if your model has `onDelete` hooks
      })

      // Clean up Recipients.
      await Recipient.destroy({
        where: {
          id: [activeCdiGrant.recipientId, inactiveCdiGrant.recipientId, nonCdiGrantActive.recipientId, nonCdiGrantInactive.recipientId],
        },
      })
    })

    it('includes reports with Active grants', async () => {
      const filters = { 'grantStatus.in': 'active' }
      const { activityReport: scope } = await filtersToScopes(filters)

      // eslint-disable-next-line max-len
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: reportIds,
            },
          ],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id).includes(nonCdiReportActive.id)).toBe(true)
    })

    it("doesn't include reports with Active grants", async () => {
      const filters = { 'grantStatus.nin': 'active' }
      const { activityReport: scope } = await filtersToScopes(filters)

      // eslint-disable-next-line max-len
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: reportIds,
            },
          ],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id).includes(nonCdiReportInactive.id)).toBe(true)
    })

    it('includes reports with Inactive grants', async () => {
      const filters = { 'grantStatus.in': 'inactive' }
      const { activityReport: scope } = await filtersToScopes(filters)

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: reportIds,
            },
          ],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id).includes(nonCdiReportInactive.id)).toBe(true)
    })

    it("doesn't include reports with Inactive grants", async () => {
      //
      const filters = { 'grantStatus.nin': 'inactive' }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: reportIds,
            },
          ],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id).includes(nonCdiReportActive.id)).toBe(true)
    })

    it('includes reports with CDI grants', async () => {
      const filters = { 'grantStatus.in': 'cdi' }
      const { activityReport: scope } = await filtersToScopes(filters)

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: reportIds,
            },
          ],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id).includes(cdiReportActive.id)).toBe(true)
    })

    it("doesn't include reports with NonCDI grants", async () => {
      const filters = { 'grantStatus.nin': 'cdi' }
      const { activityReport: scope } = await filtersToScopes(filters)

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: reportIds,
            },
          ],
        },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id).includes(nonCdiReportActive.id)).toBe(true)
      expect(found.map((f) => f.id).includes(nonCdiReportInactive.id)).toBe(true)
    })
  })
})
