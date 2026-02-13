import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityRecipient,
  Grant,
  Recipient,
  draftReport,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('program specialist filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('program specialist', () => {
    let reportIncluded1
    let reportIncluded2
    let reportExcluded

    let recipientIncluded1
    let recipientIncluded2
    let recipientExcluded

    let grantIncluded1
    let grantIncluded2
    let grantExcluded

    let possibleIds

    beforeAll(async () => {
      recipientIncluded1 = await Recipient.create({
        id: 120,
        name: 'Recipient 1 PS',
        uei: 'NNA5N2KHMGN2',
      })
      recipientIncluded2 = await Recipient.create({
        id: 121,
        name: 'Recipient 2 PS',
        uei: 'NNA5N2KHMBA2',
      })
      recipientExcluded = await Recipient.create({
        id: 122,
        name: 'Recipient 3 PS',
        uei: 'NNA5N2KHMBC2',
      })

      grantIncluded1 = await Grant.create({
        id: recipientIncluded1.id,
        number: 64968,
        recipientId: recipientIncluded1.id,
        programSpecialistName: 'Pat Bowman',
      })
      grantIncluded2 = await Grant.create({
        id: recipientIncluded2.id,
        number: 85248,
        recipientId: recipientIncluded2.id,
        programSpecialistName: 'Patton Blake',
      })
      grantExcluded = await Grant.create({
        id: recipientExcluded.id,
        number: 45877,
        recipientId: recipientExcluded.id,
        programSpecialistName: 'Jon Jones',
      })

      reportIncluded1 = await ActivityReport.create({ ...draftReport })
      reportIncluded2 = await ActivityReport.create({ ...draftReport })
      reportExcluded = await ActivityReport.create({ ...draftReport })

      await ActivityRecipient.create({
        activityReportId: reportIncluded1.id,
        grantId: grantIncluded1.id,
      })
      await ActivityRecipient.create({
        activityReportId: reportIncluded2.id,
        grantId: grantIncluded2.id,
      })
      await ActivityRecipient.create({
        activityReportId: reportExcluded.id,
        grantId: grantExcluded.id,
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
      await Grant.destroy({
        where: { id: [grantIncluded1.id, grantIncluded2.id, grantExcluded.id] },
        individualHooks: true,
      })
      await Recipient.destroy({
        where: { id: [recipientIncluded1.id, recipientIncluded2.id, recipientExcluded.id] },
      })
    })

    it('includes program specialist with a partial match', async () => {
      const filters = { 'programSpecialist.ctn': ['pat'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]))
    })

    it('excludes recipients that do not partial match or have no recipients', async () => {
      const filters = { 'programSpecialist.nctn': ['pat'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportExcluded.id, sharedTestData.globallyExcludedReport.id]))
    })
  })
})
