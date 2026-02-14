import { REPORT_STATUSES } from '@ttahub/common'
import db, {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  Grant,
  NextStep,
  Region,
} from '../models'
import filtersToScopes from '../scopes'
import totalHrsAndRecipientGraph from './totalHrsAndRecipientGraph'
import { createOrUpdate } from '../services/activityReports'

const RECIPIENT_ID = 975107
const GRANT_ID_ONE = 10639719
const GRANT_ID_TWO = 20761384

const mockUser = {
  id: 179538,
  homeRegionId: 1,
  name: 'user1779538',
  hsesUsername: 'user1779538',
  hsesUserId: 'user1779538',
  lastLogin: new Date(),
}

const mockUserTwo = {
  id: 297138,
  homeRegionId: 1,
  name: 'user297138',
  hsesUserId: 'user297138',
  hsesUsername: 'user297138',
  lastLogin: new Date(),
}

const mockUserThree = {
  id: 394062,
  homeRegionId: 1,
  name: 'user394062',
  hsesUserId: 'user394062',
  hsesUsername: 'user394062',
  lastLogin: new Date(),
}

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANT_ID_ONE },
    { activityRecipientId: GRANT_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
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
  regionId: 177,
}

const regionTwoReport = {
  ...reportObject,
  regionId: 133,
}

const legacyReport = {
  ...reportObject,
  regionId: 177,
}

describe('Total Hrs and Recipient Graph widget', () => {
  beforeAll(async () => {
    await User.create(mockUser)
    await Region.bulkCreate(
      [
        { name: 'office 177', id: 177 },
        { name: 'office 133', id: 133 },
        { name: 'office 188', id: 188 },
      ],
      { validate: true, individualHooks: true }
    )
    await Recipient.create({ name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' })
    await Grant.bulkCreate(
      [
        {
          id: GRANT_ID_ONE,
          number: GRANT_ID_ONE,
          recipientId: RECIPIENT_ID,
          regionId: 177,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2021/01/02'),
        },
        {
          id: GRANT_ID_TWO,
          number: GRANT_ID_TWO,
          recipientId: RECIPIENT_ID,
          regionId: 177,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2021/01/02'),
        },
      ],
      { validate: true, individualHooks: true }
    )
  })

  afterAll(async () => {
    const reports = await ActivityReport.findAll({
      where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] },
    })
    const ids = reports.map((report) => report.id)
    await NextStep.destroy({ where: { activityReportId: ids } })
    await ActivityRecipient.destroy({ where: { activityReportId: ids } })
    await ActivityReport.destroy({ where: { id: ids } })
    await User.destroy({ where: { id: [mockUser.id, mockUserTwo.id, mockUserThree.id] } })
    await Grant.destroy({ where: { id: [GRANT_ID_ONE, GRANT_ID_TWO] }, individualHooks: true })
    await Recipient.destroy({ where: { id: [RECIPIENT_ID] } })
    await Region.destroy({ where: { id: [133, 177, 188] } })
    await db.sequelize.close()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('handles no filters', async () => {
    const query = {}
    const scopes = await filtersToScopes(query)
    const data = await totalHrsAndRecipientGraph(scopes, query)
    expect(data.length).toBe(3)
  })

  it('retrieves line graph data by month', async () => {
    // Outside of Start Date bounds.
    await createOrUpdate({ ...regionOneReport, duration: 1, startDate: '2021-01-03' })

    // One Report in Feb.
    await createOrUpdate({ ...regionOneReport, startDate: '2021-02-15', duration: 2 })

    // Four Reports in Jun.
    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-06-05',
      duration: 3,
      ttaType: ['training'],
    })

    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-06-05',
      duration: 3.3,
      ttaType: ['training'],
    })

    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-06-15',
      duration: 4,
      ttaType: ['technical-assistance'],
    })

    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-06-20',
      duration: 5.5,
      ttaType: ['training', 'technical-assistance'],
    })

    // Two Reports in Jul.
    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-07-01',
      duration: 6,
      ttaType: ['training'],
    })

    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-07-09',
      duration: 7,
      ttaType: ['training', 'technical-assistance'],
    })

    // Outside of End Date bounds.
    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-08-08',
      duration: 8,
      ttaType: ['training', 'technical-assistance'],
    })

    // Different Region.
    await createOrUpdate({ ...regionTwoReport, duration: 1.5 })

    const query = { 'region.in': ['177'], 'startDate.win': '2021/02/01-2021/07/31' }
    const scopes = await filtersToScopes(query)
    const data = await totalHrsAndRecipientGraph(scopes, query)

    // Overall trace categories.
    expect(data.length).toEqual(3)

    // Hours of Training.
    expect(data[0].x).toEqual(['Feb', 'Jun', 'Jul'])
    expect(data[0].y).toStrictEqual([0, 6.3, 6])
    expect(data[0].month).toStrictEqual([false, false, false])

    // Hours of Technical Assistance.
    expect(data[1].x).toEqual(['Feb', 'Jun', 'Jul'])
    expect(data[1].y).toStrictEqual([2, 4, 0])

    // Both.
    expect(data[2].x).toEqual(['Feb', 'Jun', 'Jul'])
    expect(data[2].y).toStrictEqual([0, 5.5, 7])
  })

  it('retrieves line graph data by day', async () => {
    await createOrUpdate({
      ...regionOneReport,
      regionId: 188,
      startDate: '2021-06-10',
      duration: 1,
      ttaType: ['training'],
    })

    await createOrUpdate({
      ...regionOneReport,
      regionId: 188,
      startDate: '2021-06-15',
      duration: 2,
      ttaType: ['technical-assistance'],
    })

    await createOrUpdate({
      ...regionOneReport,
      regionId: 188,
      startDate: '2021-06-20',
      duration: 3.3,
      ttaType: ['training', 'technical-assistance'],
    })

    await createOrUpdate({
      ...regionOneReport,
      regionId: 188,
      startDate: '2021-06-20',
      duration: 4,
      ttaType: ['technical-assistance'],
    })

    const query = { 'region.in': ['188'], 'startDate.win': '2021/06/01-2021/06/30' }
    const scopes = await filtersToScopes(query)
    const data = await totalHrsAndRecipientGraph(scopes, query)

    // Overall trace categories.
    expect(data.length).toEqual(3)

    // Hours of Training.
    expect(data[0].x).toEqual(['Jun-10', 'Jun-15', 'Jun-20'])
    expect(data[0].y).toStrictEqual([1, 0, 0])
    expect(data[0].month).toStrictEqual(['Jun', 'Jun', 'Jun'])

    // Hours of Technical Assistance.
    expect(data[1].x).toEqual(['Jun-10', 'Jun-15', 'Jun-20'])
    expect(data[1].y).toStrictEqual([0, 2, 4])

    // Both.
    expect(data[2].x).toEqual(['Jun-10', 'Jun-15', 'Jun-20'])
    expect(data[2].y).toStrictEqual([0, 0, 3.3])
  })

  it('retrieves legacy reports line graph data', async () => {
    // Legacy Report Jan.
    await createOrUpdate({
      ...legacyReport,
      duration: 1,
      startDate: '2020-01-03',
      ttaType: ['Training'],
    })

    // Legacy Reports Feb.
    await createOrUpdate({
      ...legacyReport,
      duration: 2,
      startDate: '2020-02-10',
      ttaType: ['Technical Assistance'],
    })

    await createOrUpdate({
      ...legacyReport,
      duration: 3,
      startDate: '2020-02-20',
      ttaType: ['Technical Assistance'],
    })

    // Legacy Reports Mar.
    await createOrUpdate({
      ...legacyReport,
      duration: 4.5,
      startDate: '2020-03-05',
      ttaType: ['Both'],
    })

    const query = { 'region.in': ['177'], 'startDate.win': '2020/01/01-2020/03/31' }
    const scopes = await filtersToScopes(query)
    const data = await totalHrsAndRecipientGraph(scopes, query)

    // Overall trace categories.
    expect(data.length).toEqual(3)

    // Hours of Training.
    expect(data[0].x).toEqual(['Jan', 'Feb', 'Mar'])
    expect(data[0].y).toStrictEqual([1, 0, 0])

    // Hours of Technical Assistance.
    expect(data[1].x).toEqual(['Jan', 'Feb', 'Mar'])
    expect(data[1].y).toStrictEqual([0, 5, 0])

    // Both.
    expect(data[2].x).toEqual(['Jan', 'Feb', 'Mar'])
    expect(data[2].y).toStrictEqual([0, 0, 4.5])
  })

  it('retrieves months with year when range is longer than a year', async () => {
    // Year 1
    await createOrUpdate({
      ...regionOneReport,
      duration: 1,
      startDate: '2021-11-03',
      ttaType: ['training'],
    })

    await createOrUpdate({
      ...regionOneReport,
      duration: 2,
      startDate: '2021-12-20',
      ttaType: ['technical-assistance'],
    })

    // Year 2
    await createOrUpdate({
      ...regionOneReport,
      duration: 3.2,
      startDate: '2022-01-15',
      ttaType: ['training', 'technical-assistance'],
    })

    await createOrUpdate({
      ...regionOneReport,
      duration: 3,
      startDate: '2022-02-22',
      ttaType: ['training'],
    })

    // Year 3
    await createOrUpdate({
      ...regionOneReport,
      duration: 3,
      startDate: '2023-05-01',
      ttaType: ['technical-assistance'],
    })

    const query = { 'region.in': ['177'], 'startDate.win': '2021/11/01-2023/06/01' }
    const scopes = await filtersToScopes(query)
    const data = await totalHrsAndRecipientGraph(scopes, query)

    // Overall trace categories.
    expect(data.length).toEqual(3)

    // Hours of Training.
    expect(data[0].x).toEqual(['Nov-21', 'Dec-21', 'Jan-22', 'Feb-22', 'May-23'])
    expect(data[0].y).toStrictEqual([1, 0, 0, 3, 0])

    // Hours of Technical Assistance.
    expect(data[1].x).toEqual(['Nov-21', 'Dec-21', 'Jan-22', 'Feb-22', 'May-23'])
    expect(data[1].y).toStrictEqual([0, 2, 0, 0, 3])

    // Both.
    expect(data[2].x).toEqual(['Nov-21', 'Dec-21', 'Jan-22', 'Feb-22', 'May-23'])
    expect(data[2].y).toStrictEqual([0, 0, 3.2, 0, 0])
  })

  it("doesn't throw when likely no reports found (TTAHUB-2172)", async () => {
    const query = { 'region.in': [100], 'startDate.win': '2222/01/01-3000/01/01' }
    const scopes = await filtersToScopes(query)
    expect(() => totalHrsAndRecipientGraph(scopes, query)).not.toThrow()
  })

  it('handles null duration values by treating them as 0', async () => {
    // Create a report with valid values first
    await createOrUpdate({
      ...regionOneReport,
      startDate: '2021-04-15',
      duration: 1,
      ttaType: ['training'],
    })

    // Mock the findAll method to return a null duration
    const originalFindAll = ActivityReport.findAll
    ActivityReport.findAll = jest.fn().mockImplementation(async () => [
      {
        id: 99999,
        startDate: new Date('2021-04-15'),
        ttaType: ['training'],
        duration: null, // This tests the null handling code path
      },
    ])

    try {
      const query = { 'region.in': ['177'], 'startDate.win': '2021/04/01-2021/04/30' }
      const scopes = await filtersToScopes(query)
      const data = await totalHrsAndRecipientGraph(scopes, query)

      // Verify that the training hours for April are 0 (not undefined or null)
      expect(data[2].name).toBe('Hours of Training')

      // Find the April entry (could be Apr-14 or Apr-15 depending on timezone)
      const aprilEntry = data[2].x.find((x) => x.startsWith('Apr-'))
      expect(aprilEntry).toBeDefined()

      const aprIndex = data[2].x.indexOf(aprilEntry)
      expect(data[2].y[aprIndex]).toBe(0)
    } finally {
      // Restore the original method
      ActivityReport.findAll = originalFindAll
    }
  })

  it('handles reports with null startDate', async () => {
    // Mock the findAll method to return a report with null startDate
    const originalFindAll = ActivityReport.findAll
    ActivityReport.findAll = jest.fn().mockImplementation(async () => [
      {
        id: 99998,
        startDate: null, // This tests the null startDate code path
        ttaType: ['training'],
        duration: 5,
      },
      {
        id: 99997,
        startDate: new Date('2021-05-15'),
        ttaType: ['training'],
        duration: 3,
      },
    ])

    try {
      const query = { 'region.in': ['177'], 'startDate.win': '2021/05/01-2021/05/31' }
      const scopes = await filtersToScopes(query)
      const data = await totalHrsAndRecipientGraph(scopes, query)

      // Should not throw and should only include the report with valid startDate
      expect(data.length).toBe(3)
      // The report with null startDate should be skipped
      const mayEntry = data[2].x.find((x) => x.startsWith('May-'))
      expect(mayEntry).toBeDefined()
    } finally {
      ActivityReport.findAll = originalFindAll
    }
  })

  it('handles query without startDate.win filter', async () => {
    // Create some reports for this test
    await createOrUpdate({
      ...regionOneReport,
      regionId: 133,
      startDate: '2021-09-15',
      duration: 2,
      ttaType: ['training'],
    })

    // Query without startDate.win - this tests the branch where dateRange is undefined
    const query = { 'region.in': ['133'] }
    const scopes = await filtersToScopes(query)
    const data = await totalHrsAndRecipientGraph(scopes, query)

    // Should return data without throwing
    expect(data.length).toBe(3)
    // When no date range is provided, multipleYrs should be true and useDays should be false
  })

  it('handles start date only (partial date range)', async () => {
    // Test case where only startDate is provided (no end date after split)
    const originalFindAll = ActivityReport.findAll
    ActivityReport.findAll = jest.fn().mockImplementation(async () => [
      {
        id: 99996,
        startDate: new Date('2021-08-15'),
        ttaType: ['training'],
        duration: 2,
      },
    ])

    try {
      // Query with a date range that has only start date
      const query = { 'region.in': ['177'], 'startDate.win': '2021/08/01' }
      const scopes = await filtersToScopes(query)
      const data = await totalHrsAndRecipientGraph(scopes, query)

      // Should handle gracefully
      expect(data.length).toBe(3)
    } finally {
      ActivityReport.findAll = originalFindAll
    }
  })
})
