import { Op, filtersToScopes, User, EventReportPilot, sequelize, mockUser, mockCollaboratorUser } from './testHelpers'

describe('trainingReports/eventId', () => {
  let reportWithEventId
  let reportWithoutEventId
  let reportWithNullEventId
  let possibleIds

  beforeAll(async () => {
    // create user.
    await User.create(mockUser)

    // Report with event to find.
    reportWithEventId = await EventReportPilot.create(
      {
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: { eventId: 'R01-TR-23-1035' },
      },
      { individualHooks: false }
    )

    // Report without event to find.
    reportWithoutEventId = await EventReportPilot.create(
      {
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: { eventId: 'R01-TR-23-2484' },
      },
      { individualHooks: false }
    )

    // Report with null event.
    reportWithNullEventId = await EventReportPilot.create(
      {
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: {},
      },
      { individualHooks: false }
    )

    possibleIds = [reportWithEventId.id, reportWithoutEventId.id, reportWithNullEventId.id]
  })

  afterAll(async () => {
    // destroy reports.
    await EventReportPilot.destroy({
      where: {
        id: possibleIds,
      },
    })

    // destroy user.
    await User.destroy({ where: { id: [mockUser.id, mockCollaboratorUser.id] } })

    await sequelize.close()
  })

  it('returns event with event id', async () => {
    const filters = { 'eventId.ctn': '1035' }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(1)
    expect(found[0].id).toBe(reportWithEventId.id)
  })

  it('returns events without event id', async () => {
    const filters = { 'eventId.nctn': '1035' }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(2)
    const reportIds = found.map((report) => report.id)

    // Assert report ids includes the report without event id.
    expect(reportIds.includes(reportWithoutEventId.id)).toBe(true)
    expect(reportIds.includes(reportWithNullEventId.id)).toBe(true)
  })
})
