import {
  Op,
  filtersToScopes,
  ActivityReport,
  createReport,
  destroyReport,
  createGrant,
  faker,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('stateCode filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('stateCode', () => {
    let reportOne
    let reportTwo
    let reportThree
    let possibleIds

    beforeAll(async () => {
      const grantOne = await createGrant({
        stateCode: 'KS',
      })

      const grantTwo = await createGrant({
        stateCode: 'MO',
      })

      reportOne = await createReport({
        id: faker.datatype.number(),
        activityRecipients: [
          {
            grantId: grantOne.id,
          },
        ],
      })
      reportTwo = await createReport({
        id: faker.datatype.number(),
        activityRecipients: [
          {
            grantId: grantOne.id,
          },
          {
            grantId: grantTwo.id,
          },
        ],
      })
      reportThree = await createReport({
        id: faker.datatype.number(),
        activityRecipients: [
          {
            grantId: grantTwo.id,
          },
        ],
      })

      possibleIds = [reportOne.id, reportTwo.id, reportThree.id, sharedTestData.globallyExcludedReport.id]
    })

    afterAll(async () => {
      await destroyReport(reportOne)
      await destroyReport(reportTwo)
      await destroyReport(reportThree)
    })

    it('includes reports with grants with the given state code', async () => {
      const filters = { 'stateCode.ctn': ['KS'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]))
    })
  })
})
