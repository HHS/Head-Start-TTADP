import { Op, filtersToScopes, User, EventReportPilot, sequelize, mockUser, mockCollaboratorUser } from './testHelpers'

describe('trainingReports/creator', () => {
  let reportByMockUser1
  let reportByMockUser2
  let reportByCollaboratorUser
  let possibleIds

  beforeAll(async () => {
    // create user.
    await User.create(mockUser)

    // Create collaborator user.
    await User.create(mockCollaboratorUser)

    // create first report by mockUser
    reportByMockUser1 = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [mockUser.id],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    // create second report by mockUser
    reportByMockUser2 = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {},
    })

    // create report by collaboratorUser
    reportByCollaboratorUser = await EventReportPilot.create({
      ownerId: mockCollaboratorUser.id,
      pocIds: [mockCollaboratorUser.id],
      collaboratorIds: [mockCollaboratorUser.id],
      regionId: 3,
      data: {},
    })

    possibleIds = [reportByMockUser1.id, reportByMockUser2.id, reportByCollaboratorUser.id]
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

  it('returns reports created by mockUser', async () => {
    const filters = { 'creator.in': String(mockUser.id) }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(2)

    const reportIds = found.map((report) => report.id)

    expect(reportIds.includes(reportByMockUser1.id)).toBe(true)
    expect(reportIds.includes(reportByMockUser2.id)).toBe(true)
  })

  it('returns reports created by mockCollaboratorUser', async () => {
    const filters = { 'creator.in': String(mockCollaboratorUser.id) }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(1)

    expect(found[0].id).toBe(reportByCollaboratorUser.id)
  })

  it('does not match reports created by other users', async () => {
    const otherUserId = 99999 // A user ID not in any report
    const filters = { 'creator.in': String(otherUserId) }
    const { trainingReport: scope } = await filtersToScopes(filters)
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    })
    expect(found.length).toBe(0)
  })
})
