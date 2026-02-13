import { REPORT_STATUSES } from '@ttahub/common'
import db, { User, Recipient, Grant, Region } from '../models'
import filtersToScopes from '../scopes'
import overview from './overview'
import { formatQuery } from '../routes/widgets/utils'
import { createGrant, createRecipient, createReport, createUser, destroyReport, createRegion } from '../testUtils'

describe('Dashboard overview widget', () => {
  let user
  let grantOne
  let grantTwo
  let grantThree
  let grantFour

  let recipientOne
  let recipientTwo

  let regionOneReportOne
  let regionOneReportTwo
  let regionOneReportThree
  let regionOneReportFour
  let regionTwoReport
  let reportWithNewDate

  let weirdRegionOne
  let weirdRegionTwo

  beforeAll(async () => {
    weirdRegionOne = await createRegion()
    weirdRegionTwo = await createRegion()
    recipientOne = await createRecipient()
    recipientTwo = await createRecipient()
    grantOne = await createGrant({ recipientId: recipientOne.id, regionId: weirdRegionOne.id })
    grantTwo = await createGrant({ recipientId: recipientOne.id, regionId: weirdRegionOne.id })
    grantThree = await createGrant({ recipientId: recipientOne.id, regionId: weirdRegionTwo.id })
    grantFour = await createGrant({ recipientId: recipientTwo.id, regionId: weirdRegionOne.id })
    user = await createUser()

    const reportObject = {
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: user.id,
      lastUpdatedById: user.id,
      ECLKCResourcesUsed: ['test'],
      activityRecipients: [{ grantId: grantOne.id }, { grantId: grantTwo.id }],
      approvingManagerId: 1,
      numberOfParticipants: 11,
      deliveryMethod: 'in-person',
      duration: 1,
      endDate: '2021-01-01T12:00:00Z',
      startDate: '2021-01-01T12:00:00Z',
      requester: 'requester',
      targetPopulations: ['pop'],
      reason: ['reason'],
      participants: ['participants'],
      topics: ['topics'],
      ttaType: ['technical-assistance'],
      version: 2,
    }

    const regionOneReport = {
      ...reportObject,
      regionId: weirdRegionOne.id,
    }

    regionTwoReport = {
      ...reportObject,
      numberOfParticipants: 8,
      regionId: weirdRegionTwo.id,
      activityRecipients: [{ grantId: grantTwo.id }],
    }

    reportWithNewDate = {
      ...reportObject,
      startDate: '2021-06-01T12:00:00Z',
      endDate: '2021-06-02T12:00:00Z',
      regionId: weirdRegionOne.id,
      deliveryMethod: 'method',
    }

    regionOneReportOne = await createReport({ ...regionOneReport, duration: 1 })
    regionOneReportTwo = await createReport({
      ...regionOneReport,
      duration: 2,
      deliveryMethod: 'In-person',
    })
    regionOneReportThree = await createReport({ ...regionOneReport, duration: 4 })
    regionOneReportFour = await createReport({ ...regionOneReport, duration: 5 })
    regionTwoReport = await createReport({ ...regionTwoReport, duration: 1.5 })
    reportWithNewDate = await createReport({ ...reportWithNewDate, duration: 6 })
  })

  afterAll(async () => {
    await destroyReport(regionOneReportOne)
    await destroyReport(regionOneReportTwo)
    await destroyReport(regionOneReportThree)
    await destroyReport(regionOneReportFour)
    await destroyReport(regionTwoReport)
    await destroyReport(reportWithNewDate)

    await Grant.destroy({
      where: {
        id: [grantOne.id, grantTwo.id, grantThree.id, grantFour.id],
      },
      individualHooks: true,
    })
    await Recipient.destroy({ where: { id: [recipientOne.id, recipientTwo.id] } })
    await Region.destroy({ where: { id: [weirdRegionOne.id, weirdRegionTwo.id] } })
    await User.destroy({ where: { id: user.id } })
    await db.sequelize.close()
  })

  it('retrieves data', async () => {
    const query = { 'region.in': [weirdRegionOne.id], 'startDate.win': '2021/01/01-2021/01/01' }
    const scopes = await filtersToScopes(query)
    const data = await overview(scopes, formatQuery(query))

    expect(data.numReports).toBe('4')
    expect(data.numGrants).toBe('2')
    expect(data.inPerson).toBe('4.0')
    expect(data.sumDuration).toBe('12.0')
    expect(data.numParticipants).toBe('44')
    expect(data.numRecipients).toBe('1')
    expect(data.totalRecipients).toBe('2')
    expect(data.recipientPercentage).toBe('50.00%')
  })

  it('accounts for different date ranges', async () => {
    const query = { 'region.in': [weirdRegionOne.id], 'startDate.win': '2021/06/01-2021/06/02' }
    const scopes = await filtersToScopes(query)
    const data = await overview(scopes, formatQuery(query))

    expect(data.numReports).toBe('1')
    expect(data.numGrants).toBe('2')
    expect(data.inPerson).toBe('0')
    expect(data.sumDuration).toBe('6.0')
    expect(data.numParticipants).toBe('11')
    expect(data.numRecipients).toBe('1')
    expect(data.totalRecipients).toBe('2')
    expect(data.recipientPercentage).toBe('50.00%')
  })

  it('accounts for different regions', async () => {
    const query = { 'region.in': [weirdRegionTwo.id] }
    const scopes = await filtersToScopes(query)
    const data = await overview(scopes, formatQuery(query))

    expect(data.numReports).toBe('1')
    expect(data.numGrants).toBe('1')
    expect(data.inPerson).toBe('1.0')
    expect(data.numParticipants).toBe('8')
    expect(data.sumDuration).toBe('1.5')
    expect(data.totalRecipients).toBe('1')
    expect(data.numRecipients).toBe('1')
    expect(data.recipientPercentage).toBe('100.00%')
  })
})
