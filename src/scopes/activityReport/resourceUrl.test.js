/* eslint-disable max-len */
import {
  Op,
  REPORT_STATUSES,
  filtersToScopes,
  ActivityReport,
  ActivityReportResource,
  Resource,
  draftReport,
  findOrCreateResources,
  processActivityReportForResourcesById,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('resourceUrl filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })
  describe('resourceUrl', () => {
    let reportOne
    let reportTwo
    let reportOneWasCreated
    let reportTwoWasCreated
    let arOneResources
    let arTwoResources

    const reportOneUrls = ['http://google.com', 'http://github.com', 'http://cloud.gov', 'https://adhocteam.us/']

    const reportTwoUrls = ['http://www.crayola.com']

    beforeAll(async () => {
      ;[reportOne, reportOneWasCreated] = await ActivityReport.findOrCreate({
        where: {
          id: 99_998,
        },
        defaults: {
          context: '',
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          numberOfParticipants: 1,
          deliveryMethod: 'method',
          duration: 0,
          endDate: '2020-01-01T12:00:00Z',
          startDate: '2020-01-01T12:00:00Z',
          requester: 'requester',
          regionId: 1,
          targetPopulations: [],
          version: 2,
        },
        individualHooks: true,
        raw: true,
      })
      await findOrCreateResources(reportOneUrls)
      arOneResources = await processActivityReportForResourcesById(reportOne.id, reportOneUrls)

      ;[reportTwo, reportTwoWasCreated] = await ActivityReport.findOrCreate({
        where: {
          id: 99_999,
        },
        defaults: {
          context: '',
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          numberOfParticipants: 1,
          deliveryMethod: 'method',
          duration: 0,
          endDate: '2020-01-01T12:00:00Z',
          startDate: '2020-01-01T12:00:00Z',
          requester: 'requester',
          regionId: 1,
          targetPopulations: [],
          version: 2,
        },
        individualHooks: true,
        raw: true,
      })
      await findOrCreateResources(reportTwoUrls)
      arTwoResources = await processActivityReportForResourcesById(reportTwo.id, reportTwoUrls)
    })

    afterAll(async () => {
      await ActivityReportResource.destroy({
        where: { activityReportId: reportOne.id },
        individualHooks: true,
      })
      await ActivityReportResource.destroy({
        where: { activityReportId: reportTwo.id },
        individualHooks: true,
      })
      await Resource.destroy({
        where: { url: { [Op.in]: [...reportOneUrls, ...reportTwoUrls] } },
        individualHooks: true,
      })
      if (reportOneWasCreated) {
        await ActivityReport.destroy({
          where: { id: reportOne.id },
          individualHooks: true,
        })
      }
      if (reportTwoWasCreated) {
        await ActivityReport.destroy({
          where: { id: reportTwo.id },
          individualHooks: true,
        })
      }
    })

    it('returns correct resource url filter search results', async () => {
      const filters = { 'resourceUrl.ctn': ['google'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, { id: [reportOne.id, reportTwo.id] }],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportOne.id]))
    })

    it('excludes correct resource url filter search results', async () => {
      const filters = { 'resourceUrl.nctn': ['http'] }
      const { activityReport: scope } = await filtersToScopes(filters)

      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, { id: [reportOne.id, reportTwo.id] }],
        },
      })
      expect(found.length).toBe(0)
    })
  })
})
